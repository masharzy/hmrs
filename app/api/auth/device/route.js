import { db } from "../../../../lib/firebase-admin";
import { normalizePhone } from "../../../../lib/phone-pin";
import { deviceFromRequest,deviceCookie,currentDeviceBan,describeDevice,publicDeviceId } from "../../../../lib/login-security";
export const runtime="nodejs",dynamic="force-dynamic";
export async function GET(req){
 const device=deviceFromRequest(req);
 const bannedUntil=currentDeviceBan(req,device.id);
 const url=new URL(req.url),phone=normalizePhone(url.searchParams.get("phone"));
 let recognized=null;
 if(phone&&!bannedUntil){
  try{
   const doc=await db().collection("deviceRecognitions").doc(device.id+"_"+phone).get();
   if(doc.exists){const v=doc.data();recognized={name:v.name,role:v.role};}
  }catch{ /* Recognition is optional. */ }
 }
 return Response.json({
  recognized,device:{id:publicDeviceId(device.id),label:describeDevice(req.headers.get("user-agent"))},
  lockedUntil:bannedUntil||null
 },{headers:{"Cache-Control":"no-store","Set-Cookie":deviceCookie(device.id)}});
}
