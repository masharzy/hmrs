import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getSubjects,evaluateSubject,validatePartialMarkForStudent} from "../lib/academic.js";
import {TEACHER_SUBJECT_OPTIONS,cleanAssignedClasses,cleanTeachingSubjects} from "../lib/teacher-subjects.js";
import {canAccessGrade} from "../lib/school-identity.js";

const source=path=>readFileSync(path,"utf8");
const api=source("app/api/portal/route.js");
const portal=source("components/DashboardPortal.jsx");
const sheet=source("components/ResultEntryGrid.jsx");
const accounts=source("components/AccountManager.jsx");
test("Bangla first and second papers have separate CQ and MCQ components",()=>{
 for(const grade of [9,10]){
  const b=getSubjects(grade,"science","higher-math").find(s=>s.id==="bangla");
  assert.deepEqual(b.parts.map(p=>[p.key,p.max,p.paper]),[
   ["firstCq",70,"বাংলা ১ম পত্র"],["firstMcq",30,"বাংলা ১ম পত্র"],
   ["secondCq",70,"বাংলা ২য় পত্র"],["secondMcq",30,"বাংলা ২য় পত্র"]
  ]);
  assert.equal(b.max,200);
  assert.equal(evaluateSubject(b,{firstCq:40,firstMcq:20,secondCq:40,secondMcq:20}).status,"complete");
 }
});
test("legacy combined Bengali marks are preserved without fabricated paper breakdown",()=>{
 const b=getSubjects(9).find(s=>s.id==="bangla");
 const result=evaluateSubject(b,{cq:46,mcq:20});
 assert.equal(result.status,"complete");
 assert.equal(result.legacy,true);
 assert.equal(result.received,66);
 assert.equal(evaluateSubject(b,{firstCq:46,firstMcq:20}).status,"missing");
});
test("partial sheet marks validate independently without losing other paper cells",()=>{
 const student={grade:9,group:"science",elective:"higher-math"};
 assert.deepEqual(validatePartialMarkForStudent(student,"bangla",{firstCq:"৬০",firstMcq:"৩০"}),{firstCq:60,firstMcq:30});
 assert.throws(()=>validatePartialMarkForStudent(student,"bangla",{secondMcq:40}),/নম্বর/);
 assert.throws(()=>validatePartialMarkForStudent(student,"bangla",{unexpected:3}),/বিষয়ের অংশ/);
 assert.match(api,/validatePartialMarkForStudent\(student,subjectId,entry.scores\)/);
 assert.match(api,/merge:true/);
});
test("Excel grid is dense and offers group & separate subject/paper filters",()=>{
 const css=source("app/dashboard/results-workflow.css");
 assert.match(sheet,/paper\|\|/);
 assert.match(source("lib/academic.js"),/বাংলা ১ম পত্র/);
 assert.match(source("lib/academic.js"),/বাংলা ২য় পত্র/);
 assert.match(sheet,/ব্যবসায় শিক্ষা/);
 assert.match(sheet,/মানবিক/);
 assert.match(sheet,/toBanglaDigits\(index\+1\)/);
 assert.match(css,/height:27px/);
 assert.match(css,/width:53px/);
 assert.match(css,/hmrs-sheet-sticky/);
});
test("teacher assignments allow multiple grades without class-teacher role",()=>{
 const actor={role:"teacher",assignedClasses:["6","9"]};
 assert.equal(canAccessGrade(actor,6),true);
 assert.equal(canAccessGrade(actor,9),true);
 assert.equal(canAccessGrade(actor,8),false);
 assert.deepEqual(cleanAssignedClasses(["৬","9","6","10"]),["6","9","10"]);
 assert.equal(cleanTeachingSubjects(["math","math","unknown"]).length,1);
 assert.ok(TEACHER_SUBJECT_OPTIONS.some(x=>x.id==="higher-math"));
 assert.match(api,/teachingSubjects/);
});
test("accounts only return teachers and are paginated on server",()=>{
 assert.match(api,/resource === "staff.accounts"/);
 assert.match(api,/where\("role","in",\["teacher","class_teacher"\]\)/);
 assert.match(api,/items:users.slice\(\(page-1\)\*size,page\*size\)/);
 assert.match(accounts,/request\("staff.accounts"/);
 assert.match(accounts,/নতুন PIN/);
 assert.match(accounts,/ভূমিকা/);
 assert.match(portal,/<AccountManager actor=\{actor\} request=\{request\}/);
});
test("teacher can edit student and admissions offer grade/group filter",()=>{
 assert.match(api,/needRole\(actor, \["principal","teacher","class_teacher"\]\)/);
 assert.match(portal,/editing\.type==="student"/);
 assert.match(portal,/admissionGrade/);
 assert.match(portal,/admissionGroup/);
 assert.match(portal,/filteredAdmissions/);
});
test("public notice has separate page and all published records visible",()=>{
 assert.match(source("components/SiteHeader.jsx"),/\["নোটিশ","\/notices"\]/);
 assert.match(source("app/notices/page.jsx"),/<NoticeBoard full\/>/);
 assert.match(source("components/NoticeBoard.jsx"),/full\?notices/);
});
