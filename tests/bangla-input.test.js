import { test } from "node:test";
import assert from "node:assert/strict";
import { toAsciiDigits, toBanglaDigits, parseBanglaNumber, gradeLabel } from "../lib/bangla-numbers.js";
import { normalizeAdmissionData, validateAdmission, validateAdmissionStep, firstInvalidStep } from "../lib/admission-validation.js";
const valid = {
 studentName:"সুমাইয়া আক্তার", dob:"২০১৪-০৫-১৪", birthRegistration:"২০১৪১২৩৪৫৬৭৮৯০১২৩",
 gender:"female", grade:"৬", section:"a", group:"science",
 fatherName:"মোঃ রহমান", fatherPhone:"+৮৮০১৭১২৩৪৫৬৭৮",
 motherName:"মোছাঃ রহিমা", motherPhone:"০১৮১২৩৪৫৬৭৮",
 studentPhone:"৮৮০১৯১২৩৪৫৬৭৮", guardianAddress:"সোনারগাঁ, নারায়ণগঞ্জ, ঢাকা",
 previousSchool:"স্থানীয় প্রাথমিক বিদ্যালয়",previousClass:"৫",previousResult:"৮০",paymentMethod:"later"
};
test("Bangla, English, Arabic digit parsing", () => {
 assert.equal(toAsciiDigits("৬৫০ ٢٥ 012"),"650 25 012");
 assert.equal(toBanglaDigits("৬ 790"),"৬ ৭৯০");
 assert.equal(parseBanglaNumber("১০.৫"),10.5);
 assert.equal(parseBanglaNumber("abc"),NaN);
 assert.equal(gradeLabel("৬"),"ষষ্ঠ (৬) শ্রেণি");
});
test("valid Bangla admission fields normalize to canonical values", () => {
 const v=normalizeAdmissionData(valid);
 assert.equal(v.dob,"2014-05-14");
 assert.equal(v.birthRegistration,"20141234567890123");
 assert.equal(v.grade,"6");
 assert.equal(v.fatherPhone,"01712345678");
 assert.equal(v.studentPhone,"01912345678");
 assert.equal(v.previousClass,"5");
 assert.deepEqual(validateAdmission(valid),{});
});
test("step validation points to the field and stage", () => {
 const v={...valid,birthRegistration:"123",fatherPhone:"123",previousSchool:""};
 const errors=validateAdmission(v);
 assert.ok(errors.birthRegistration);
 assert.ok(errors.fatherPhone);
 assert.ok(errors.previousSchool);
 assert.equal(firstInvalidStep(errors),0);
 assert.equal(firstInvalidStep(validateAdmissionStep({...valid,fatherPhone:"11"},1)),1);
});
test("future DOB and malformed phones rejected", () => {
 const e=validateAdmission({...valid,dob:"৩২০০-০১-০১",studentPhone:"+৯১১৭১২৩৪৫৬৭৮"});
 assert.ok(e.dob);
 assert.ok(e.studentPhone);
});
