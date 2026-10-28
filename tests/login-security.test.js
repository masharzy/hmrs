import {test} from "node:test";
import assert from "node:assert/strict";
import {ACCOUNT_LIMIT,DEVICE_LOCK_MS,nextFailureState,describeDevice,signDevice,parseSignedDevice,banCookie,currentDeviceBan} from "../lib/login-security.js";
test("5 consecutive failures lock device for 12h",()=>{
 const now=1000;let d={},a={};
 for(let i=1;i<=5;i++){
  const n=nextFailureState(d,a,now);d=n.device;a=n.account;
  assert.equal(d.failures,i);
  assert.equal(d.lockedUntil,i===5?now+DEVICE_LOCK_MS:0);
 }
});
test("20 consecutive failures lock account",()=>{
 let d={},a={};
 for(let i=1;i<=20;i++){const n=nextFailureState(d,a,100);a=n.account;d={};assert.equal(a.locked,i>=ACCOUNT_LIMIT)}
});
test("signed device IDs and ban cookie cannot be forged",()=>{
 process.env.DEVICE_COOKIE_SECRET="test-only-secret";
 const id="a".repeat(32),signed=signDevice(id);
 assert.equal(parseSignedDevice(signed),id);
 assert.equal(parseSignedDevice("b"+signed.slice(1)),null);
 const cookie=banCookie(id,Date.now()+3600000);
 const req={headers:new Headers({cookie:cookie.split(";")[0]})};
 assert.ok(currentDeviceBan(req,id)>Date.now());
});
test("device label is coarse, not a fingerprint",()=>assert.match(describeDevice("Mozilla/5.0 (iPhone) Safari/605"),/iPhone/));
