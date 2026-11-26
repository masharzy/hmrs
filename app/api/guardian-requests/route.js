import { createHash } from "node:crypto";
import { db } from "../../../lib/firebase-admin";
import { normalizePhone, normalizePin, makePinCredential } from "../../../lib/phone-pin";
import { parseBanglaNumber } from "../../../lib/bangla-numbers";
import { verifyOrigin, fail, json, cleanText } from "../../../lib/server-auth";
export const runtime="nodejs",dynamic="force-dynamic";
const digits=value=>String(value||"").replace(/[০-৯]/g,d=>"০১২৩৪৫৬৭৮৯".indexOf(d)).replace(/[^0-9]/g,"");
export async function POST(req){
 try{
  verifyOrigin(req);
  if(Number(req.headers.get("content-length")||0)>5000)return fail("অনুরোধটি অনেক বড়",413);
  const body=await req.json(),store=db();
  const phone=normalizePhone(body.phone),pin=normalizePin(body.pin);
  const grade=parseBanglaNumber(body.grade),roll=Number(digits(body.roll));
  const group=grade>=9?cleanText(body.group,20):"";
  const birthRegistration=digits(body.birthRegistration);
  const guardianName=cleanText(body.guardianName,100),relation=cleanText(body.relation,30);
  if(!phone||!pin||!guardianName||guardianName.length<2||!["father","mother","guardian"].includes(relation))
   return fail("অভিভাবকের নাম, সম্পর্ক, মোবাইল নম্বর ও পাঁচ সংখ্যার PIN সঠিকভাবে দিন");
  if(!Number.isInteger(grade)||grade<6||grade>10||!Number.isInteger(roll)||roll<1||roll>9999)
   return fail("শিক্ষার্থীর শ্রেণি ও রোল সঠিকভাবে দিন");
  if(grade>=9&&!["science","business","humanities"].includes(group))return fail("নবম–দশম শ্রেণির বিভাগ নির্বাচন করুন");
  if(birthRegistration.length<10||birthRegistration.length>17)return fail("শিক্ষার্থীর জন্মনিবন্ধন নম্বর সঠিকভাবে দিন");
  const throttleId=createHash("sha256").update(phone).digest("hex");
  const throttleRef=store.collection("guardianRequestLimits").doc(throttleId);
  const now=Date.now(),today=new Date(now).toISOString().slice(0,10);
  const limit=await store.runTransaction(async tx=>{
   const snap=await tx.get(throttleRef),data=snap.data()||{};
   const count=data.day===today?Number(data.count||0):0;
   if(count>=5)return false;
   tx.set(throttleRef,{day:today,count:count+1,updatedAt:new Date(now).toISOString()},{merge:true});
   return true;
  });
  if(!limit)return fail("আজকের জন্য আবেদন সীমা পূর্ণ হয়েছে। পরে আবার চেষ্টা করুন।",429);
  const candidates=await store.collection("students").where("grade","==",grade).where("roll","==",roll).limit(5).get();
  const matched=candidates.docs.filter(doc=>{
   const st=doc.data();
   return !st.deleting&&String(st.birthRegistration||"").replace(/[^0-9]/g,"")===birthRegistration&&
    (grade<9||st.group===group)&&[st.fatherPhone,st.motherPhone].some(value=>normalizePhone(value||"")===phone);
  });
  if(matched.length!==1)return fail("তথ্য যাচাই করা যায়নি। বিদ্যালয়ের অফিসে যোগাযোগ করুন।",404);
  const studentDoc=matched[0],student=studentDoc.data();
  const mapping=await store.collection("guardianLoginPhones").doc(phone).get();
  if(mapping.exists)return fail("এই মোবাইল নম্বরে অভিভাবক অ্যাকাউন্ট আগে থেকেই রয়েছে।",409);
  const duplicate=await store.collection("guardianRequests").where("studentId","==",studentDoc.id).where("guardianPhone","==",phone).where("status","==","pending").limit(1).get();
  if(!duplicate.empty)return fail("এই শিক্ষার্থীর জন্য আপনার আবেদন ইতিমধ্যে অপেক্ষমাণ রয়েছে।",409);
  const ref=store.collection("guardianRequests").doc();
  await ref.create({studentId:studentDoc.id,studentName:student.name,grade,group,roll,guardianName,relation,guardianPhone:phone,
   pinCredential:makePinCredential(pin),status:"pending",createdAt:new Date(now).toISOString()});
  return json({ok:true,message:"আবেদন জমা হয়েছে। প্রধান শিক্ষক বা সহকারী প্রধান শিক্ষক যাচাই করে অনুমোদন দিলে লগইন করতে পারবেন।"});
 }catch(error){console.error("Guardian registration:",String(error?.code||"request-failed").slice(0,48));return fail(error?.status?error.message:"আবেদন জমা দেওয়া যায়নি",error?.status||503)}
}
