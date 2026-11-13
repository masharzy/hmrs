import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeAdmissionData, validateAdmission } from "../lib/admission-validation.js";
const read=p=>readFileSync(p,"utf8");
const home=read("app/page.jsx"),header=read("components/SiteHeader.jsx"),footer=read("components/SiteFooter.jsx");
const portal=read("components/DashboardPortal.jsx"),api=read("app/api/portal/route.js"),data=read("lib/dashboard-data.js");
const sheet=read("components/ResultEntryGrid.jsx"),accounts=read("components/AccountManager.jsx");

test("admission is only presented in the homepage hero",()=>{
 assert.match(home,/hmrs-home-primary[^\n]+href="\/admission"/);
 assert.doesNotMatch(home,/hmrs-home-services|hmrs-home-final|hmrs-home-school-badge/);
 assert.doesNotMatch(header,/\["ভর্তি আবেদন","\/admission"\]/);
 assert.doesNotMatch(footer,/<Link href="\/admission">/);
 assert.match(header,/হাজী মতিউর রহমান সরকার উচ্চ বিদ্যালয়/);
});
test("shared parent phones are valid even across distinct pupils",()=>{
 const base={studentName:"নবীন ইসলাম",dob:"2016-01-02",birthRegistration:"12345678901234567",gender:"male",
 grade:"6",fatherName:"মোঃ করিম",fatherPhone:"০১৭১২৩৪৫৬৭৮",motherName:"মোছাঃ লায়লা",
 motherPhone:"০১৭১২৩৪৫৬৭৮",studentPhone:"01787654321",guardianAddress:"সোনারগাঁ নারায়ণগঞ্জ",
 previousSchool:"প্রাথমিক বিদ্যালয়",previousClass:"5",previousResult:"A",paymentMethod:"later",paymentReference:""};
 const sameContact={...base,studentName:"নবিলা ইসলাম",birthRegistration:"12345678901234568",studentPhone:"01787654322"};
 assert.deepEqual(validateAdmission(base),{});
 assert.deepEqual(validateAdmission(sameContact),{});
 assert.equal(normalizeAdmissionData(base).fatherPhone,normalizeAdmissionData(sameContact).fatherPhone);
});
test("class teacher sees all students in marks but remains scoped elsewhere",()=>{
 assert.match(data,/actor.role==="class_teacher" && section!=="marks"/);
 assert.match(data,/section==="marks"&&actor.role==="class_teacher"/);
 assert.match(api,/async function studentForMarks/);
 assert.match(api,/const student = await studentForMarks\(actor/);
 assert.match(api,/resource === "marks"/);
});
test("result sheet supports grade, subject and all-subject mode with Bengali serials",()=>{
 assert.match(portal,/markMode==="grid"/);
 assert.match(portal,/<ResultEntryGrid/);
 assert.match(sheet,/<option value="">সব বিষয়<\/option>/);
 assert.match(sheet,/toBanglaDigits\(index\+1\)/);
 assert.match(sheet,/getSubjects/);
 assert.match(sheet,/marks\.batch/);
 assert.match(api,/action === "marks.batch"/);
 assert.match(api,/validateMarkForStudent\(student,subjectId,scores\)/);
 assert.match(api,/batch\.commit\(\)/);
});
test("principal user management edits all roles, hashes PIN and asks before delete",()=>{
 assert.match(portal,/<AccountManager users=\{data.users\|\|\[\]\}/);
 assert.match(accounts,/role="dialog"/);
 assert.match(accounts,/role="alertdialog"/);
 assert.match(accounts,/confirmed:true/);
 assert.match(api,/action === "account.update"/);
 assert.match(api,/action === "account.delete"/);
 assert.match(api,/makePinCredential\(pin\)/);
 assert.match(api,/uid===actor.uid/);
 assert.match(api,/removeStudentRecords\(actor,user.studentId,store,action\)/);
});
