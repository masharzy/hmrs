import { admissionSchema } from "../../../lib/admission-schema.js";
import { createApplicationEditToken, verifyApplicationEditToken, canApplicantEdit } from "../../../lib/admission-edit.js";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../../lib/firebase-admin";
import { fail, handleError, json, verifyOrigin } from "../../../lib/server-auth";
import { normalizeAdmissionData, validateAdmission, firstInvalidStep } from "../../../lib/admission-validation";

export const runtime = "nodejs";
export async function POST(req){
 try{
  verifyOrigin(req);
  if(Number(req.headers.get("content-length")||0)>16000)return fail("অনুরোধটি অনেক বড়",413);
  const raw=await req.json();
  if(!raw || typeof raw!=="object" || Array.isArray(raw))return fail("আবেদনের তথ্য সঠিক নয়",400);
  if(raw.action==="load" || raw.action==="update"){
   const id=typeof raw.applicationId==="string"?raw.applicationId.trim():"";
   const editToken=raw.editToken;
   if(!/^[a-zA-Z0-9]{12,150}$/.test(id))return fail("আবেদন শনাক্ত করা যায়নি",400);
   const store=db(),ref=store.collection("admissions").doc(id);
   const existing=await ref.get();
   if(!existing.exists || !verifyApplicationEditToken(editToken,existing.data()?.editTokenHash))
    return fail("এডিট লিংকটি সঠিক নয়। বিদ্যালয়ে যোগাযোগ করুন।",403);
   if(!canApplicantEdit(existing.data()))
    return fail("এই আবেদন অনুমোদন বা নিষ্পত্তি হয়ে গেছে; আর এডিট করা যাবে না।",409);
   if(raw.action==="load"){
    const saved=existing.data();
    const fields=Object.keys(admissionSchema.shape).filter(key=>key!=="website");
    return json({ok:true,applicationId:id,values:Object.fromEntries(fields.map(key=>[key,saved[key]??""]))});
   }
   if(!raw.values || typeof raw.values!=="object" || Array.isArray(raw.values))return fail("পরিবর্তনের তথ্য সঠিক নয়");
   const normalized=normalizeAdmissionData(raw.values);
   const errors=validateAdmission(raw.values);
   if(Object.keys(errors).length)
    return json({error:"চিহ্নিত তথ্যগুলো সঠিকভাবে পূরণ করুন।",fieldErrors:errors,step:firstInvalidStep(errors)},422);
   const parsed=admissionSchema.safeParse(normalized);
   if(!parsed.success)return fail("আবেদনের তথ্য সঠিক নয়");
   if(parsed.data.website)return fail("আবেদনের তথ্য সঠিক নয়");
   const {website,...record}=parsed.data;
   await store.runTransaction(async tx=>{
    const latest=await tx.get(ref);
    if(!latest.exists || !verifyApplicationEditToken(editToken,latest.data()?.editTokenHash))
     throw Object.assign(Error("এডিট লিংকটি সঠিক নয়"),{status:403});
    if(!canApplicantEdit(latest.data()))
     throw Object.assign(Error("আবেদন অনুমোদনের পর এডিট করা যায় না"),{status:409});
    tx.update(ref,{...record,section:FieldValue.delete(),updatedAt:new Date().toISOString(),lastEditSource:"applicant"});
   });
   return json({ok:true,applicationId:id,status:"pending",updated:true});
  }
  const values=normalizeAdmissionData(raw);
  const errors=validateAdmission(raw);
  if(Object.keys(errors).length){
   return json({error:"চিহ্নিত তথ্যগুলো সঠিকভাবে পূরণ করুন।",fieldErrors:errors,step:firstInvalidStep(errors)},422);
  }
  const parsed=admissionSchema.safeParse(values);
  if(!parsed.success){
   const fieldErrors={};
   for(const issue of parsed.error.issues){
     const name=String(issue.path[0]||"");
     if(name && !fieldErrors[name])fieldErrors[name]="তথ্যটি সঠিকভাবে পূরণ করুন।";
   }
   return json({error:"কয়েকটি তথ্য যাচাই করা যায়নি।",fieldErrors,step:firstInvalidStep(fieldErrors)},422);
  }
  const data=parsed.data;
  if(data.website)return json({ok:true,message:"আবেদন গ্রহণ করা হয়েছে"});
  const {website,...saved}=data;
  const {token,tokenHash}=createApplicationEditToken();
  const doc=await db().collection("admissions").add({
   ...saved,status:"pending",paymentStatus:"unverified",editTokenHash:tokenHash,
   createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
  });
  return json({ok:true,applicationId:doc.id,editToken:token,status:"pending"},201);
 }catch(e){return handleError(e);}
}
