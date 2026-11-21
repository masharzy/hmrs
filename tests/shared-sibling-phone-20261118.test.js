import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {studentPhoneOwners,addStudentPhoneOwner,removeStudentPhoneOwner,
 isSharedStudentPhone,studentLoginIdentity,sameLoginIdentity} from "../lib/student-phone-sharing.js";
import {normalizeAdmissionData,validateAdmission} from "../lib/admission-validation.js";
import {getAdmissionSessionYear} from "../lib/admission-session.js";
import {makePinCredential,verifyPin} from "../lib/phone-pin.js";
const read=path=>readFileSync(path,"utf8");

test("old loginPhones single-uid record converts safely when sibling is enrolled",()=>{
 const existing={uid:"older",createdAt:"2020-01-01"};
 assert.deepEqual(studentPhoneOwners(existing),["older"]);
 const shared=addStudentPhoneOwner(existing,"younger");
 assert.equal(shared.uid,"older");
 assert.equal(shared.createdAt,"2020-01-01");
 assert.deepEqual(studentPhoneOwners(shared),["older","younger"]);
 assert.equal(isSharedStudentPhone(shared),true);
 assert.deepEqual(studentPhoneOwners(addStudentPhoneOwner(shared,"younger")),["older","younger"]);
});
test("siblings remain independently reachable when one student deletes account",()=>{
 const shared=addStudentPhoneOwner(addStudentPhoneOwner(undefined,"first"),"second");
 const remaining=removeStudentPhoneOwner(shared,"first");
 assert.deepEqual(studentPhoneOwners(remaining),["second"]);
 assert.equal(remaining.uid,"second");
 assert.equal(removeStudentPhoneOwner(remaining,"second"),null);
 const other=addStudentPhoneOwner(shared,"third");
 assert.deepEqual(studentPhoneOwners(removeStudentPhoneOwner(other,"second")),["first","third"]);
});
test("same phone and even same PIN never select a sibling without class/roll",()=>{
 const older={uid:"older",grade:10,roll:1,group:"science"};
 const younger={uid:"younger",grade:10,roll:1,group:"humanities"};
 const first=studentLoginIdentity({grade:"১০",roll:"১",group:"science"});
 const second=studentLoginIdentity({grade:"১০",roll:"১",group:"humanities"});
 assert.deepEqual(first,{grade:10,roll:1,group:"science"});
 assert.equal(sameLoginIdentity(older,first),true);
 assert.equal(sameLoginIdentity(younger,first),false);
 assert.equal(sameLoginIdentity(younger,second),true);
 assert.equal(studentLoginIdentity({grade:10,roll:1}),null);
 assert.equal(studentLoginIdentity({grade:5,roll:1}),null);
 assert.equal(studentLoginIdentity({grade:8,roll:"৭"}).group,"");
 const pin=makePinCredential("12345");
 const pin2=makePinCredential("12345");
 assert.notEqual(pin.hash,pin2.hash);
 assert.equal(verifyPin("১২৩৪৫",pin),true);
});
test("siblings can submit admissions with identical parent and student phone numbers",()=>{
 const input={
  studentName:"Child B",session:String(getAdmissionSessionYear()),dob:"2014-01-01",birthRegistration:"12345678901234567",gender:"female",
  grade:"৬",fatherName:"Parent",fatherPhone:"01712345678",
  motherName:"Parent Two",motherPhone:"01712345678",studentPhone:"01712345678",
  guardianAddress:"Village, post, upazila, district",previousSchool:"Previous School",
  paymentMethod:"later"
 };
 assert.deepEqual(validateAdmission(input),{});
 const normalized=normalizeAdmissionData(input);
 assert.equal(normalized.fatherPhone,normalized.studentPhone);
 assert.equal(normalized.motherPhone,normalized.studentPhone);
});
test("admission approval, activation, record edits and deletion preserve sibling phone mappings",()=>{
 const portal=read("app/api/portal/route.js");
 assert.match(portal,/action === "application.approve"/);
 assert.match(portal,/tx\.set\(phoneRef,addStudentPhoneOwner\(phoneNow\.data\(\),newUser\.uid\)\)/);
 assert.match(portal,/tx\.set\(phoneRef,addStudentPhoneOwner\(mapping\.data\(\),user\.uid\)\)/);
 assert.match(portal,/tx\.set\(newPhoneRef,addStudentPhoneOwner\(newPhone\?\.data\(\),old\.uid\)\)/);
 assert.match(portal,/removeStudentPhoneOwner\(mapping\.data\(\),student\.uid\)/);
 assert.doesNotMatch(portal,/if\(phoneNow\.exists\)throw/);
 const registration=read("lib/phone-accounts.js");
 assert.match(registration,/role==="student"/);
 assert.match(registration,/addStudentPhoneOwner\(mappingSnap\.data\(\),uid\)/);
});
test("login selects a student's class/group/roll before PIN, while staff phones remain unique",()=>{
 const login=read("app/api/auth/login/route.js");
 const ui=read("app/login/[role]/page.jsx");
 const device=read("app/api/auth/device/route.js");
 assert.match(login,/owners\.length>1/);
 assert.match(login,/student-selection-required/);
 assert.match(login,/studentLoginIdentity\(body\)/);
 assert.match(login,/sameLoginIdentity\(profile,identity\)/);
 assert.match(login,/matches\.length!==1/);
 assert.match(ui,/studentIdentityRequired/);
 assert.match(ui,/grade:studentGrade,group:studentGroup,roll:studentRoll/);
 assert.match(device,/isSharedStudentPhone/);
 assert.match(read("app/admission/page.jsx"),/আগে অন্য শিক্ষার্থীর লগইনে ব্যবহৃত নম্বরও দেওয়া যাবে/);
});
