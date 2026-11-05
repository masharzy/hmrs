import { randomUUID } from "node:crypto";
import { actorFrom, fail, handleError, json, verifyOrigin } from "../../../lib/server-auth";
import { uploadImageToImgBB } from "../../../lib/imgbb.js";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function imageKind(bytes){
 if(bytes.length>3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return "jpg";
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return "png";
 if(bytes.subarray(0,4).toString()==="RIFF"&&bytes.subarray(8,12).toString()==="WEBP")return "webp";
 return null;
}

export async function POST(req){
 try{
  verifyOrigin(req);
  const actor=await actorFrom(req);
  if(actor.role!=="principal")return fail("শুধুমাত্র প্রধান শিক্ষক রুটিনের ছবি আপলোড করতে পারবেন",403);
  const key=process.env.IMGBB_API_KEY;
  if(!key?.trim())return fail("Vercel-এ IMGBB_API_KEY সেট করা নেই",503);
  if(Number(req.headers.get("content-length")||0)>6200000)return fail("ছবির আকার সর্বোচ্চ ৫ MB",413);
  const form=await req.formData();
  const file=form.get("file");
  if(!file||typeof file.arrayBuffer!=="function"||file.size<64||file.size>5*1024*1024)
   return fail("JPG, PNG বা WebP ছবি দিন (সর্বোচ্চ ৫ MB)");
  const bytes=Buffer.from(await file.arrayBuffer());
  const extension=imageKind(bytes);
  if(!extension)return fail("ছবির ফরম্যাট সঠিক নয়");
  const {photoUrl,imageId}=await uploadImageToImgBB({bytes,apiKey:key,name:"hmrs-routine-"+randomUUID()+"."+extension});
  return json({ok:true,imageUrl:photoUrl,imageId});
 }catch(error){return handleError(error)}
}
