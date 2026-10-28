import { adminAuth, db } from "../../../../lib/firebase-admin";
import { normalizePhone, normalizePin, verifyPin } from "../../../../lib/phone-pin";
import { verifyOrigin } from "../../../../lib/server-auth";
import {
 deviceFromRequest,deviceCookie,banCookie,currentDeviceBan,clearBanCookie,
 describeDevice,maskedIp,nextFailureState,publicDeviceId
} from "../../../../lib/login-security";
export const runtime="nodejs",dynamic="force-dynamic";
const roles=new Set(["student","teacher","class_teacher","principal"]);
function reply(deviceId,body,status=200,until=0,clearBan=false){
 const r=Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
 r.headers.append("Set-Cookie",deviceCookie(deviceId));
 if(until)r.headers.append("Set-Cookie",banCookie(deviceId,until));
 if(clearBan)r.headers.append("Set-Cookie",clearBanCookie());
 return r;
}
export async function POST(req){
 const device=deviceFromRequest(req),id=device.id;
 try{
  verifyOrigin(req);
  const now=Date.now(),cookieBan=currentDeviceBan(req,id,now);
  // Signed ban cookie is verified without ANY Firebase/database access.
  if(cookieBan)return reply(id,{error:"এই ডিভাইসে ১২ ঘণ্টার লগইন নিষেধাজ্ঞা চলছে।",code:"device-locked",lockedUntil:cookieBan},429,cookieBan);
  if(Number(req.headers.get("content-length")||0)>2000)
    return reply(id,{error:"অনুরোধটি অনেক বড়"},413);
  const body=await req.json(),phone=normalizePhone(body?.phone),pin=normalizePin(body?.pin),role=body?.role;
  if(!phone||!pin||!roles.has(role))
    return reply(id,{error:"সঠিক মোবাইল নম্বর ও ৫ সংখ্যার PIN দিন"},400);
  const store=db(),deviceRef=store.collection("loginDevices").doc(id);
  const mapping=await store.collection("loginPhones").doc(phone).get();
  const uid=mapping.exists?mapping.data()?.uid:null;
  const accountRef=uid?store.collection("loginSecurity").doc(uid):null;
  const userRef=uid?store.collection("users").doc(uid):null;
  const credRef=uid?store.collection("loginCredentials").doc(uid):null;
  const label=describeDevice(req.headers.get("user-agent"));
  const info={deviceId:publicDeviceId(id),deviceLabel:label,ip:maskedIp(req),at:new Date(now).toISOString()};
  const result=await store.runTransaction(async tx=>{
   const [ds,as,us,cs]=await Promise.all([
     tx.get(deviceRef), accountRef?tx.get(accountRef):null,
     userRef?tx.get(userRef):null,credRef?tx.get(credRef):null
   ]);
   const d=ds.data()||{},a=as?.data()||{},person=us?.data(),stored=cs?.data();
   if(Number(d.lockedUntil)>now)return {kind:"device-locked",until:Number(d.lockedUntil)};
   if(a.locked===true)return {kind:"account-locked"};
   const pinMatches=stored?.phone===phone&&verifyPin(pin,stored);
   const valid=person?.active===true&&person.role===role&&pinMatches;
   // A correct PIN with the wrong portal is not a wrong-PIN guess.
   if(pinMatches&&!valid)return {kind:"incorrect"};
   if(valid){
    tx.set(deviceRef,{failures:0,lockedUntil:0,label,lastSuccessAt:info.at},{merge:true});
    tx.set(accountRef,{failures:0,lastSuccessAt:info.at},{merge:true});
    tx.set(store.collection("deviceRecognitions").doc(id+"_"+phone),{
       uid,name:person.name||"ব্যবহারকারী",role,deviceLabel:label,lastSuccessAt:info.at
    },{merge:true});
    return {kind:"ok",uid};
   }
   const next=nextFailureState(d,a,now);
   tx.set(deviceRef,{
    ...next.device,label,
    recent:[...(d.recent||[]).slice(-11),{...info,phone:phone.slice(0,3)+"****"+phone.slice(-4),reason:"ভুল PIN বা পোর্টাল"}]
   },{merge:true});
   if(accountRef){
    const history=[...(a.history||[]).slice(-29),{...info,reason:"ভুল PIN বা পোর্টাল"}];
    tx.set(accountRef,{
      ...next.account,history,uid,phone,
      lockReason:next.account.locked?"সফল লগইন ছাড়াই ২০ বার ভুল PIN/পোর্টাল চেষ্টা":(a.lockReason||""),
      lockedAt:next.account.locked?info.at:(a.lockedAt||null)
    },{merge:true});
   }
   return {
    kind:next.account.locked?"account-locked":next.device.lockedUntil?"device-locked":"incorrect",
    until:next.device.lockedUntil||0,
    accountJustLocked:!!next.account.locked&&!a.locked
   };
  });
  if(result.accountJustLocked&&uid){
    await adminAuth().revokeRefreshTokens(uid).catch(e=>console.error("Auth revoke:",e?.code||"error"));
    await store.collection("audit").add({
      action:"security.account.locked",actorUid:"system",target:uid,at:info.at,reason:"২০টি ধারাবাহিক ভুল PIN"
    }).catch(()=>{});
  }
  if(result.kind==="account-locked")return reply(id,{
    error:"এই অ্যাকাউন্ট লক হয়েছে। প্রধান শিক্ষক আনলক না করা পর্যন্ত লগইন করা যাবে না।",code:"account-locked"
  },423);
  if(result.kind==="device-locked")return reply(id,{
    error:"টানা ৫ বার ভুল PIN: এই ডিভাইস থেকে ১২ ঘণ্টা লগইন বন্ধ।",code:"device-locked",lockedUntil:result.until
  },429,result.until);
  if(result.kind==="incorrect")return reply(id,{
    error:"মোবাইল নম্বর, PIN বা পোর্টাল সঠিক নয়",code:"invalid-credentials"
  },401);
  const customToken=await adminAuth().createCustomToken(result.uid);
  return reply(id,{customToken},200,0,true);
 }catch(e){
   console.error("HMRS login:",String(e?.code||"request-failed").slice(0,48));
   return reply(id,{error:e?.status?e.message:"লগইন করা যায়নি, আবার চেষ্টা করুন।",code:"server-error"},e?.status||503);
 }
}
