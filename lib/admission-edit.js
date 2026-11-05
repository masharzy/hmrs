import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

export function createApplicationEditToken(){
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashApplicationEditToken(token) };
}
export function hashApplicationEditToken(token){
  return createHash("sha256").update("hmrs:application:edit:v1:"+token).digest("hex");
}
export function verifyApplicationEditToken(token, stored){
  if(typeof token!=="string" || !/^[A-Za-z0-9_-]{43}$/.test(token))return false;
  if(typeof stored!=="string" || !/^[0-9a-f]{64}$/.test(stored))return false;
  return timingSafeEqual(Buffer.from(hashApplicationEditToken(token),"hex"),Buffer.from(stored,"hex"));
}
export function canApplicantEdit(application){
  return application?.status==="pending" && typeof application?.editTokenHash==="string";
}
