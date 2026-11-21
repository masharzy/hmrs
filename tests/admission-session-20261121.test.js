import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 getAdmissionSessionYear,getAdmissionSessionOptions,storedAdmissionSession,allowedAdmissionSession
} from "../lib/admission-session.js";
import {normalizeAdmissionData,validateAdmissionStep,ADMISSION_FIELDS} from "../lib/admission-validation.js";
import {admissionSchema} from "../lib/admission-schema.js";

const read=path=>readFileSync(path,"utf8");

test("admission choices change automatically at midnight Bangladesh time",()=>{
 const previous=new Date("2026-12-31T17:59:59Z");
 const next=new Date("2026-12-31T18:00:00Z");
 assert.equal(getAdmissionSessionYear(previous),2026);
 assert.equal(getAdmissionSessionYear(next),2027);
 assert.deepEqual(getAdmissionSessionOptions(getAdmissionSessionYear(previous)),[["2026","2026 (Current)"],["2027","2027"]]);
 assert.deepEqual(getAdmissionSessionOptions(getAdmissionSessionYear(next)),[["2027","2027 (Current)"],["2028","2028"]]);
});

test("new applications accept only current or next session and server checks it",()=>{
 const today=new Date("2026-11-21T15:00:00Z");
 for(const year of ["2026","2027"])assert.equal(allowedAdmissionSession(year,{now:today}),true);
 for(const year of ["2025","2028","",null,"2026abc","২০২৬"])assert.equal(allowedAdmissionSession(year,{now:today}),false);
 assert.equal(allowedAdmissionSession("2026",{now:new Date("2027-01-01T00:00:00Z")}),false);
 assert.equal(allowedAdmissionSession("2028",{now:new Date("2027-01-01T00:00:00Z")}),true);
 assert.ok(ADMISSION_FIELDS[0].includes("session"));
 assert.equal(normalizeAdmissionData({session:"২০২৬"}).session,"2026");
 assert.match(validateAdmissionStep({session:"2020"},0).session,/সেশন/);
 assert.equal(validateAdmissionStep({session:String(getAdmissionSessionYear())},0).session,undefined);
 assert.equal(admissionSchema.shape.session.safeParse("2026").success,true);
 assert.equal(admissionSchema.shape.session.safeParse("bad").success,false);
});

test("editing preserves an existing older session but cannot invent an arbitrary past year",()=>{
 const now=new Date("2027-01-02T00:00:00Z");
 assert.equal(allowedAdmissionSession("2026",{now,existingSession:"2026"}),true);
 assert.equal(allowedAdmissionSession("2025",{now,existingSession:"2026"}),false);
 assert.equal(storedAdmissionSession({session:"2026",createdAt:"2027-01-01T00:00:00Z"}),"2026");
 assert.equal(storedAdmissionSession({createdAt:"2026-11-21T15:40:00Z"}),"2026");
 assert.equal(storedAdmissionSession({createdAt:"2026-12-31T18:00:00Z"}),"2027");
});

test("form, APIs and principal editor include persisted session and remove Bangla-only name instruction",()=>{
 const form=read("app/admission/page.jsx");
 const admissionApi=read("app/api/admissions/route.js");
 const portalApi=read("app/api/portal/route.js");
 const admin=read("components/PrincipalRecordEditor.jsx");
 const dash=read("components/DashboardPortal.jsx");
 assert.match(form,/label="ভর্তি সেশন" name="session"/);
 assert.match(form,/sessionChoices=getAdmissionSessionOptions\(sessionYear\)/);
 assert.doesNotMatch(form,/বাংলায় পূর্ণ নাম লিখুন/);
 assert.match(admissionApi,/session:storedAdmissionSession\(saved\)/);
 assert.match(admissionApi,/validateAdmission\(raw\.values,\{existingSession:/);
 assert.match(portalApi,/session:storedAdmissionSession\(application\)/);
 assert.match(admin,/session:"Admission Session"/);
 assert.match(dash,/Session: \{storedAdmissionSession\(a\)\}/);
});
