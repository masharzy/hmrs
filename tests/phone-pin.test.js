import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, normalizePin, makePinCredential, verifyPin } from "../lib/phone-pin.js";

test("BD phones accept 01, +880, 880, formatting and Bengali digits", () => {
 const formats=["01712345678","+8801712345678","8801712345678","+880 1712-345678","০১৭১২৩৪৫৬৭৮"];
 for(const f of formats) assert.equal(normalizePhone(f),"01712345678");
});
test("invalid BD phone rejected",()=>{
 for(const f of ["1712345678","0171234567","019123456789","0151x345678","+911712345678",null])
 assert.equal(normalizePhone(f),null);
});
test("PIN preserves leading zero and requires exactly five digits",()=>{
 assert.equal(normalizePin("০১২৩৪"),"01234");
 assert.equal(normalizePin("01234"),"01234");
 assert.equal(normalizePin("123456"),null);
 assert.equal(normalizePin("12 34"),null);
});
test("PIN salted and verified with constant-time comparison",()=>{
 const a=makePinCredential("01234"),b=makePinCredential("01234");
 assert.notEqual(a.salt,b.salt);
 assert.notEqual(a.hash,b.hash);
 assert.equal(verifyPin("01234",a),true);
 assert.equal(verifyPin("০১২৩৪",a),true);
 assert.equal(verifyPin("01235",a),false);
 assert.equal(verifyPin("01234",{salt:"invalid",hash:"invalid"}),false);
});
