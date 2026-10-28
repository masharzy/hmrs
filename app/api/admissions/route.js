import { z } from "zod";
import { db } from "../../../lib/firebase-admin";
import { fail, handleError, json, verifyOrigin } from "../../../lib/server-auth";
import { normalizeAdmissionData, validateAdmission, firstInvalidStep } from "../../../lib/admission-validation";

export const runtime = "nodejs";
const field=(limit=100)=>z.string().trim().min(1).max(limit);
const optional=(limit=100)=>z.string().trim().max(limit).optional().default("");
const schema=z.object({
 studentName:field(100),dob:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
 birthRegistration:z.string().regex(/^\d{17}$/),gender:z.enum(["male","female","other"]),
 grade:z.coerce.number().int().min(6).max(10),section:z.enum(["a","b","c"]),
 group:z.enum(["science","business","humanities"]),
 fatherName:field(100),fatherPhone:z.string().regex(/^01[3-9]\d{8}$/),
 motherName:field(100),motherPhone:z.string().regex(/^01[3-9]\d{8}$/),
 studentPhone:z.string().regex(/^01[3-9]\d{8}$/),
 guardianAddress:field(350),previousSchool:field(150),
 previousClass:optional(30),previousResult:optional(80),
 paymentMethod:z.enum(["mobile_banking","online_banking","later"]),
 paymentReference:optional(70),website:optional(120)
}).strict();

export async function POST(req){
 try{
  verifyOrigin(req);
  if(Number(req.headers.get("content-length")||0)>16000)return fail("অনুরোধটি অনেক বড়",413);
  const raw=await req.json();
  if(!raw || typeof raw!=="object" || Array.isArray(raw))return fail("আবেদনের তথ্য সঠিক নয়",400);
  const values=normalizeAdmissionData(raw);
  const errors=validateAdmission(raw);
  if(Object.keys(errors).length){
   return json({error:"চিহ্নিত তথ্যগুলো সঠিকভাবে পূরণ করুন।",fieldErrors:errors,step:firstInvalidStep(errors)},422);
  }
  const parsed=schema.safeParse(values);
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
  const doc=await db().collection("admissions").add({
   ...saved,status:"pending",paymentStatus:"unverified",
   createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
  });
  return json({ok:true,applicationId:doc.id,status:"pending"},201);
 }catch(e){return handleError(e);}
}
