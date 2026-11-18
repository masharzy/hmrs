import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateAdmissionPin,firstInvalidStep,ADMISSION_FIELDS} from "../lib/admission-validation.js";
import {normalizePin,makePinCredential,verifyPin} from "../lib/phone-pin.js";

const read=p=>readFileSync(p,"utf8");

test("new admission requires exactly five PIN digits, including Bengali digits",()=>{
 assert.ok(validateAdmissionPin(""));
 assert.ok(validateAdmissionPin("1234"));
 assert.ok(validateAdmissionPin("123456"));
 assert.ok(validateAdmissionPin("12A45"));
 assert.equal(validateAdmissionPin("12345"),"");
 assert.equal(validateAdmissionPin("০১২৩৪"),"");
 assert.equal(normalizePin("০১২৩৪"),"01234");
 assert.ok(ADMISSION_FIELDS[2].includes("studentPin"));
 assert.equal(firstInvalidStep({studentPin:"PIN missing"}),2);
});
test("edit keeps a previously configured student PIN when left blank",()=>{
 assert.equal(validateAdmissionPin("",{alreadySet:true}),"");
 assert.ok(validateAdmissionPin("12",{alreadySet:true}));
 assert.equal(validateAdmissionPin("98765",{alreadySet:true}),"");
 assert.ok(validateAdmissionPin("",{alreadySet:false}));
});
test("student selected PIN is hashed, and verification is per user",()=>{
 const a=makePinCredential("01234");
 const b=makePinCredential("01234");
 assert.notEqual(a.salt,b.salt);
 assert.notEqual(a.hash,b.hash);
 assert.equal(verifyPin("01234",a),true);
 assert.equal(verifyPin("01234",b),true);
 assert.equal(verifyPin("01235",b),false);
});
test("admission uses five separate PIN boxes and submits PIN only as a dedicated field",()=>{
 const form=read("app/admission/page.jsx"),input=read("components/PinInput.jsx");
 assert.match(form,/PinInput id="admission-studentPin"/);
 assert.match(form,/values:form,studentPin/);
 assert.match(form,/\\.\\.\\.form,studentPin/);
 assert.match(form,/validateAdmissionPin\(studentPin/);
 assert.match(input,/Array\.from\(\{length:5\}/);
 assert.match(input,/type="password"/);
 assert.match(form,/ভাইবোন একই মোবাইল নম্বর/);
});
test("admission API stores hash only and never returns PIN material to applicant",()=>{
 const api=read("app/api/admissions/route.js");
 assert.match(api,/makePinCredential\(normalizePin\(raw\.studentPin\)\)/);
 assert.match(api,/studentPinCredential,status:"pending"/);
 assert.match(api,/pinConfigured:!!saved\.studentPinCredential\?\.hash/);
 assert.match(api,/studentPinCredential:freshCredential/);
 assert.match(api,/raw\.studentPin/);
 assert.doesNotMatch(api,/studentPin:raw\.studentPin/);
});
test("approver no longer invents or sees the student's PIN",()=>{
 const portal=read("app/api/portal/route.js");
 const dashboard=read("components/DashboardPortal.jsx");
 const data=read("lib/dashboard-data.js");
 assert.match(portal,/const applicantPin=appNow\.data\(\)\?\.studentPinCredential/);
 assert.match(portal,/tx\.create\(credentialRef,\{\.\.\.applicantPin,phone,createdAt:at\}\)/);
 assert.match(portal,/studentPinCredential:FieldValue\.delete\(\)/);
 assert.doesNotMatch(dashboard,/onChange=\{setPin\}\/\>/);
 assert.match(dashboard,/item\.pinConfigured\?"Student PIN set during admission"/);
 assert.match(data,/studentPinCredential,\.\.\.value/);
 assert.match(portal,/studentPinCredential, \.\.\.data/);
});
test("home features five colorful compact cards and dedicated notice board",()=>{
 const home=read("app/page.jsx"),styles=read("app/home.css");
 assert.match(home,/const services=\[/);
 assert.match(home,/hmrs-home-quick-grid/);
 assert.match(home,/hmrs-home-quick-card/);
 assert.match(home,/href:"\/login\/student"/);
 assert.match(home,/href:"\/admission"/);
 assert.match(home,/<NoticeBoard full\/>/);
 assert.match(styles,/hmrs-home-quick-4/);
 assert.match(styles,/@media\(max-width:600px\)/);
});
