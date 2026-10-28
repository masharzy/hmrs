import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
export const DEVICE_LIMIT=5, ACCOUNT_LIMIT=20, DEVICE_LOCK_MS=12*60*60*1000;
const secret=()=>process.env.DEVICE_COOKIE_SECRET||process.env.FIREBASE_PRIVATE_KEY||"";
const mac=value=>createHmac("sha256",secret()).update(value).digest("base64url");
const equal=(a,b)=>{if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
export function signDevice(id){return id+"."+mac("device:"+id)}
export function parseSignedDevice(value){
 if(!secret()||typeof value!=="string")return null;
 const sep=value.lastIndexOf(".");
 if(sep<0)return null;
 const id=value.slice(0,sep),sig=value.slice(sep+1);
 return /^[a-zA-Z0-9_-]{32}$/.test(id)&&equal(sig,mac("device:"+id))?id:null;
}
export function deviceFromRequest(req){
 const match=(req.headers.get("cookie")||"").match(/(?:^|;\s*)hmrs_device=([^;]+)/);
 const old=match?parseSignedDevice(match[1]):null;
 return {id:old||randomBytes(24).toString("base64url"),newDevice:!old};
}
const secure=()=>process.env.NODE_ENV==="production"?"; Secure":"";
export function deviceCookie(id){
 return "hmrs_device="+signDevice(id)+"; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000"+secure();
}
export function banCookie(id,until){
 const value=id+"."+until;
 return "hmrs_device_ban="+value+"."+mac("ban:"+value)+"; HttpOnly; SameSite=Lax; Path=/; Max-Age="+Math.ceil(Math.max(0,until-Date.now())/1000)+secure();
}
export function clearBanCookie(){return "hmrs_device_ban=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"+secure()}
export function currentDeviceBan(req,id,now=Date.now()){
 const match=(req.headers.get("cookie")||"").match(/(?:^|;\s*)hmrs_device_ban=([^;]+)/);
 const value=match?.[1];
 if(!value||!secret())return 0;
 const parts=value.split(".");
 if(parts.length!==3||parts[0]!==id)return 0;
 const until=Number(parts[1]);
 return Number.isFinite(until)&&until>now&&equal(parts[2],mac("ban:"+parts[0]+"."+parts[1]))?until:0;
}
export function describeDevice(userAgent=""){
 const ua=String(userAgent).slice(0,220);
 const device=/Android/i.test(ua)?"Android":/iPhone/i.test(ua)?"iPhone":/iPad/i.test(ua)?"iPad":/Windows/i.test(ua)?"Windows PC":/Macintosh/i.test(ua)?"Mac":/Linux/i.test(ua)?"Linux PC":"Unknown device";
 const browser=/Edg\//.test(ua)?"Edge":/Firefox\//.test(ua)?"Firefox":/CriOS|Chrome\//.test(ua)?"Chrome":/Safari\//.test(ua)?"Safari":"Browser";
 return device+" · "+browser;
}
export function maskedIp(request){
 const ip=(request.headers.get("x-forwarded-for")||"").split(",")[0].trim();
 if(/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip))return ip.split(".").slice(0,2).join(".")+".x.x";
 return ip.includes(":")?ip.split(":").slice(0,2).join(":")+"::…":"Unknown";
}
export function nextFailureState(device={},account={},now=Date.now()){
 const expired=Number(device.lockedUntil)>0&&Number(device.lockedUntil)<=now;
 const deviceFailures=(expired?0:Math.max(0,Number(device.failures)||0))+1;
 const accountFailures=Math.max(0,Number(account.failures)||0)+1;
 return {
  device:{failures:deviceFailures,lockedUntil:deviceFailures>=DEVICE_LIMIT?now+DEVICE_LOCK_MS:0},
  account:{failures:accountFailures,locked:accountFailures>=ACCOUNT_LIMIT}
 };
}
export const publicDeviceId=id=>String(id||"").slice(0,8);
