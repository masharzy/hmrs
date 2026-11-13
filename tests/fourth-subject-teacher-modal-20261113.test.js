import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {FOURTH_SUBJECT_OPTIONS,fourthSubjectSelection,selectedFourthSubject,getStudentSubjects,evaluateTranscript} from "../lib/academic.js";
import {admissionSubjects} from "../lib/admission-match.js";
import {normalizeAdmissionData,validateAdmission} from "../lib/admission-validation.js";
const source=p=>readFileSync(p,"utf8");
const science={name:"পরীক্ষার্থী",grade:10,group:"science",roll:1};
const ids=s=>getStudentSubjects(s).map(x=>x.id);
test("science fourth agriculture removes higher mathematics, even for legacy conflicting elective",()=>{
 const s={...science,optionalId:"agriculture",elective:"higher-math",fourthSubject:"agriculture"};
 assert.deepEqual(fourthSubjectSelection("science","agriculture"),{
  elective:"agriculture",fourthSubject:"agriculture",optionalId:"agriculture"
 });
 assert.equal(selectedFourthSubject(s),"agriculture");
 assert.ok(ids(s).includes("agriculture"));
 assert.ok(ids(s).includes("biology"));
 assert.equal(ids(s).includes("higher-math"),false);
 const marks=Object.fromEntries(getStudentSubjects(s).map(sub=>[sub.id,
  Object.fromEntries(sub.parts.map(part=>[part.key,part.max]))]));
 const report=evaluateTranscript(s,marks);
 assert.equal(report.complete,true);
 assert.equal(report.optionalId,"agriculture");
 assert.equal(report.rows.some(r=>r.subjectId==="higher-math"),false);
 assert.equal(report.gpa,5);
});
test("science fourth biology means higher mathematics is a compulsory subject",()=>{
 const s={...science,...fourthSubjectSelection("science","biology")};
 assert.ok(ids(s).includes("biology"));
 assert.ok(ids(s).includes("higher-math"));
 assert.equal(ids(s).includes("agriculture"),false);
 assert.equal(evaluateTranscript(s,{}).optionalId,"biology");
});
test("science fourth higher math keeps biology but no agricultural subject",()=>{
 const s={...science,...fourthSubjectSelection("science","higher-math")};
 assert.ok(ids(s).includes("higher-math"));
 assert.ok(ids(s).includes("biology"));
 assert.equal(ids(s).includes("agriculture"),false);
 assert.equal(evaluateTranscript(s,{}).optionalId,"higher-math");
});
test("other groups have only their applicable fourth-subject options",()=>{
 assert.deepEqual(FOURTH_SUBJECT_OPTIONS.science.map(x=>x.id),["biology","higher-math","agriculture"]);
 for(const group of ["business","humanities"]){
  assert.deepEqual(FOURTH_SUBJECT_OPTIONS[group].map(x=>x.id),["agriculture","home-science"]);
  const s={...science,group,...fourthSubjectSelection(group,"agriculture")};
  assert.ok(ids(s).includes("agriculture"));
  assert.equal(ids(s).includes("higher-math"),false);
 }
 assert.throws(()=>fourthSubjectSelection("science","home-science"),/৪র্থ/);
});
test("admission maps one fourth choice to persisted fields",()=>{
 assert.deepEqual(admissionSubjects({grade:10,group:"science",optionalSubject:"agriculture"}),{
  elective:"agriculture",fourthSubject:"agriculture",optionalId:"agriculture"
 });
 assert.deepEqual(admissionSubjects({grade:10,group:"science",optionalSubject:"higher-math"}),{
  elective:"higher-math",fourthSubject:"higher-math",optionalId:"higher-math"
 });
 const raw=normalizeAdmissionData({grade:"১০",group:"science",optionalSubject:"agriculture"});
 assert.equal(raw.optionalSubject,"agriculture");
 const invalid=validateAdmission({grade:"১০",group:"science",optionalSubject:""});
 assert.ok(invalid.optionalSubject);
});
test("only one visible fourth selector in admission, student edit and result portal",()=>{
 const admission=source("app/admission/page.jsx");
 const editor=source("components/PrincipalRecordEditor.jsx");
 const portal=source("components/DashboardPortal.jsx");
 assert.match(admission,/label="৪র্থ বিষয়" name="optionalSubject"/);
 assert.doesNotMatch(admission,/label="চতুর্থ \/ ঐচ্ছিক বিষয়"/);
 assert.doesNotMatch(portal,/Field label="নৈর্বাচনিক বিষয়"/);
 assert.doesNotMatch(portal,/৪র্থ বিষয় সংরক্ষণ/);
 assert.match(portal,/<StudentResultCard isAdmin/);
 assert.match(editor,/fields.push\("optionalId"\)/);
 assert.doesNotMatch(editor,/fields.push\("elective","fourthSubject"/);
 const api=source("app/api/portal/route.js");
 assert.match(api,/getStudentSubjects\(student\)/);
 assert.match(api,/fourthSubjectSelection\(group,choice\)/);
});
test("teacher modal uses accessible pressed multi-select cards, not native checkbox rows",()=>{
 const ui=source("components/AccountManager.jsx");
 const css=source("app/dashboard/results-workflow.css");
 assert.match(ui,/aria-pressed=\{chosen\}/);
 assert.match(ui,/kind="roles"/);
 assert.match(ui,/searchable options=\{TEACHER_SUBJECT_OPTIONS\}/);
 assert.doesNotMatch(ui,/type="checkbox"/);
 assert.match(css,/hmrs-teacher-picker-roles/);
 assert.match(css,/hmrs-teacher-grade-pickers/);
});
