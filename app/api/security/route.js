import { db } from "../../../lib/firebase-admin";
import { actorFrom,fail,json,verifyOrigin } from "../../../lib/server-auth";
export const runtime="nodejs",dynamic="force-dynamic";
export async function GET(req){
 try{
  const actor=await actorFrom(req);
  if(actor.role!=="principal")return fail("প্রধান শিক্ষকের অনুমতি প্রয়োজন",403);
  const store=db(),locked=await store.collection("loginSecurity").where("locked","==",true).limit(100).get();
  const docs=locked.docs;
  const users=docs.length?await store.getAll(...docs.map(d=>store.collection("users").doc(d.id))):[];
  return json({items:docs.map((doc,i)=>({
    uid:doc.id,name:users[i]?.data()?.name||"অ্যাকাউন্ট",role:users[i]?.data()?.role||"",
    phone:users[i]?.data()?.phone||doc.data().phone||"",
    lockedAt:doc.data().lockedAt||null,reason:doc.data().lockReason||"নিরাপত্তাজনিত লক",
    failures:doc.data().failures||20,history:(doc.data().history||[]).slice(-20).reverse()
  }))});
 }catch(e){return fail(e?.status?e.message:"লক তালিকা পাওয়া যায়নি",e?.status||503)}
}
export async function POST(req){
 try{
  verifyOrigin(req);
  const actor=await actorFrom(req);
  if(actor.role!=="principal")return fail("শুধু প্রধান শিক্ষক আনলক করতে পারবেন",403);
  const body=await req.json();
  const uid=typeof body?.uid==="string"?body.uid:"";
  const note=typeof body?.note==="string"?body.note.trim().slice(0,200):"";
  if(!/^[a-zA-Z0-9_-]{12,150}$/.test(uid)||note.length<5)
    return fail("অ্যাকাউন্ট এবং আনলক করার কারণ (কমপক্ষে ৫ অক্ষর) লিখুন");
  if(uid===actor.uid)return fail("নিজের অ্যাকাউন্ট আনলক করা যাবে না",403);
  const store=db(),ref=store.collection("loginSecurity").doc(uid);
  const released=await store.runTransaction(async tx=>{
   const doc=await tx.get(ref);
   if(!doc.exists||doc.data().locked!==true)return false;
   const at=new Date().toISOString();
   tx.set(ref,{locked:false,failures:0,lockReason:"",lockedAt:null,unlockedAt:at,
      unlockedBy:actor.uid,unlockNote:note},{merge:true});
   tx.set(store.collection("audit").doc(),{
      actorUid:actor.uid,action:"security.account.unlocked",target:uid,at,note,
      previousReason:doc.data().lockReason||"২০টি ভুল PIN"
   });
   return true;
  });
  if(!released)return fail("অ্যাকাউন্ট বর্তমানে লক করা নেই",409);
  return json({ok:true});
 }catch(e){return fail(e?.status?e.message:"আনলক করা যায়নি",e?.status||503)}
}
