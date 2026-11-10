import { randomUUID } from "node:crypto";
import { actorFrom, fail, handleError, json, verifyOrigin } from "../../../lib/server-auth";
import { uploadImageToImgBB } from "../../../lib/imgbb.js";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const MAX_IMAGE=3*1024*1024;
const MAX_PDF=4*1024*1024;

function imageExtension(bytes){
 if(bytes.length>3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return "jpg";
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return "png";
 if(bytes.subarray(0,4).toString()==="RIFF"&&bytes.subarray(8,12).toString()==="WEBP")return "webp";
 return "";
}

export async function POST(req){
 try{
  verifyOrigin(req);
  const actor=await actorFrom(req);
  if(actor.role!=="principal")return fail("শুধুমাত্র প্রধান শিক্ষক নোটিশের ফাইল আপলোড করতে পারবেন",403);
  // Keep below Vercel's request payload limit; never accept files larger than necessary.
  if(Number(req.headers.get("content-length")||0)>4400000)return fail("PDF সর্বোচ্চ ৪ MB, ছবি সর্বোচ্চ ৩ MB",413);
  const form=await req.formData(),file=form.get("file"),kind=form.get("kind");
  if(!file||typeof file.arrayBuffer!=="function"||!["image","pdf"].includes(kind))
   return fail("একটি ছবি বা PDF নির্বাচন করুন");
  if(file.size<20||file.size>(kind==="image"?MAX_IMAGE:MAX_PDF))
   return fail(kind==="image"?"ছবি সর্বোচ্চ ৩ MB হতে হবে":"PDF সর্বোচ্চ ৪ MB হতে হবে");
  const bytes=Buffer.from(await file.arrayBuffer());
  if(kind==="image"){
   const extension=imageExtension(bytes);
   if(!extension)return fail("শুধু JPG, PNG অথবা WebP ছবি আপলোড করুন");
   const key=process.env.IMGBB_API_KEY;
   if(!key?.trim())return fail("ImgBB API key সেট করা নেই",503);
   const {photoUrl}=await uploadImageToImgBB({
    bytes,apiKey:key,name:"hmrs-notice-"+randomUUID()+"."+extension
   });
   return json({ok:true,kind:"image",url:photoUrl});
  }
  // Inspect the file signature instead of trusting browser-supplied MIME/type.
  if(bytes.subarray(0,5).toString("ascii")!=="%PDF-")return fail("শুধু সঠিক PDF ফাইল আপলোড করুন");
  const account=process.env.CLOUDFLARE_ACCOUNT_ID||"";
  const bucket=process.env.CLOUDFLARE_R2_BUCKET||"";
  const apiToken=process.env.CLOUDFLARE_R2_API_TOKEN||"";
  const publicBase=(process.env.CLOUDFLARE_R2_PUBLIC_URL||"").replace(/\/$/,"");
  if(!/^[a-f0-9]{32}$/i.test(account)||!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)
   ||!apiToken||!/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(publicBase))
   return fail("Cloudflare R2 bucket ও public URL কনফিগার করা নেই",503);
  const key="notices/"+randomUUID()+".pdf";
  const endpoint="https://api.cloudflare.com/client/v4/accounts/"+account+"/r2/buckets/"+bucket+"/objects/"+key;
  const response=await fetch(endpoint,{
   method:"PUT",
   headers:{"Authorization":"Bearer "+apiToken,"Content-Type":"application/pdf"},
   body:bytes,cache:"no-store",
   signal:AbortSignal.timeout(20000)
  });
  if(!response.ok){
   console.error("R2 notice upload failed:",response.status);
   return fail("PDF সংরক্ষণ করা যায়নি; R2 bucket permission পরীক্ষা করুন",502);
  }
  return json({ok:true,kind:"pdf",url:publicBase+"/"+key});
 }catch(error){return handleError(error)}
}
