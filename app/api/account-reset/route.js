import { adminAuth, db } from "../../../lib/firebase-admin";
import { actorFrom, fail, json, verifyOrigin, cleanText } from "../../../lib/server-auth";
import { normalizePin, normalizePhone, makePinCredential } from "../../../lib/phone-pin";
import { studentPhoneOwners, addStudentPhoneOwner } from "../../../lib/student-phone-sharing.js";
export const runtime="nodejs",dynamic="force-dynamic";
const canReset=actor=>["principal","assistant_principal","staff_manager"].includes(actor.role);
export async function GET(req){
 try{
  const actor=await actorFrom(req);if(!canReset(actor))return fail("আপনার অ্যাকাউন্ট PIN রিসেটের অনুমতি নেই",403);
  const snap=await db().collection("users").limit(1200).get();
  const items=snap.docs.map(d=>{const u=d.data();return {id:d.id,name:u.name||"",phone:u.phone||"",role:u.role||"",active:u.active===true,studentId:u.studentId||""}})
   .filter(u=>u.active).sort((a,b)=>String(a.name).localeCompare(String(b.name),"bn"));
  return json({items});
 }catch(e){return fail(e?.status?e.message:"অ্যাকাউন্ট তালিকা আনা যায়নি",e?.status||503)}
}
export async function POST(req){
 try{
  verifyOrigin(req);const actor=await actorFrom(req);if(!canReset(actor))return fail("আপনার অ্যাকাউন্ট PIN রিসেটের অনুমতি নেই",403);
  if(Number(req.headers.get("content-length")||0)>2500)return fail("অনুরোধটি অনেক বড়",413);
  const body=await req.json(),uid=cleanText(body.uid,128),pin=normalizePin(body.pin);
  if(!uid||uid.includes("/")||!pin)return fail("অ্যাকাউন্ট নির্বাচন করে পাঁচ সংখ্যার PIN দিন");
  if(uid===actor.uid)return fail("নিজের PIN পরিবর্তনের জন্য প্রোফাইলের PIN পরিবর্তন ব্যবহার করুন");
  const store=db(),userRef=store.collection("users").doc(uid),credentialRef=store.collection("loginCredentials").doc(uid);
  const [user,credential]=await Promise.all([userRef.get(),credentialRef.get()]);
  if(!user.exists||user.data()?.active!==true)return fail("সক্রিয় অ্যাকাউন্ট পাওয়া যায়নি",404);
  const phone=normalizePhone(user.data()?.phone||"");
  if(!phone)return fail("অ্যাকাউন্টে সঠিক লগইন মোবাইল নম্বর নেই",409);
  const mappingRef=store.collection("loginPhones").doc(phone);
  const now=new Date().toISOString();
  await store.runTransaction(async tx=>{
   const [latest,mapping,currentCredential]=await Promise.all([tx.get(userRef),tx.get(mappingRef),tx.get(credentialRef)]);
   if(!latest.exists||latest.data()?.active!==true)throw Object.assign(Error("সক্রিয় অ্যাকাউন্ট পাওয়া যায়নি"),{status:404});
   if(normalizePhone(latest.data()?.phone||"")!==phone)throw Object.assign(Error("অ্যাকাউন্টের মোবাইল নম্বর পরিবর্তিত হয়েছে; আবার চেষ্টা করুন"),{status:409});
   const role=latest.data()?.role;
   if(mapping.exists){
    const map=mapping.data()||{};
    if(role==="student"){
     if(!studentPhoneOwners(map).includes(uid))tx.set(mappingRef,addStudentPhoneOwner(map,uid));
    }else if(map.uid&&map.uid!==uid)throw Object.assign(Error("এই মোবাইল নম্বর অন্য অ্যাকাউন্টে ব্যবহৃত হচ্ছে"),{status:409});
    else if(!map.uid)throw Object.assign(Error("মোবাইল নম্বরের মালিকানা যাচাই করা যাচ্ছে না"),{status:409});
   }else tx.create(mappingRef,role==="student"?addStudentPhoneOwner(null,uid):{uid,createdAt:now});
   tx.set(credentialRef,{...makePinCredential(pin),phone,createdAt:currentCredential.data()?.createdAt||now,updatedAt:now,updatedBy:actor.uid},{merge:true});
   tx.set(userRef,{pinEnabled:true,updatedAt:now,updatedBy:actor.uid},{merge:true});
  });
  await store.collection("loginSecurity").doc(uid).set({locked:false,failures:0,history:[],lockReason:"",lockedAt:null,updatedAt:now,updatedBy:actor.uid},{merge:true});
  await adminAuth().revokeRefreshTokens(uid);
  await store.collection("audit").add({actorUid:actor.uid,action:"account.pin.reset",target:uid,at:new Date().toISOString()});
  return json({ok:true});
 }catch(e){console.error("PIN reset:",String(e?.code||"request-failed").slice(0,48));return fail(e?.status?e.message:"PIN রিসেট করা যায়নি",e?.status||503)}
}
