import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getSubjects,evaluateTranscript,gradeFor} from "../lib/academic.js";
import {buildClassResultMetrics,markGroupForReport} from "../lib/result-metrics.js";
import {resultIsPublished} from "../lib/result-publication.js";
import {auditExamScores} from "../lib/result-audit.js";
import {findApplicantRosterMatch,admissionSubjects} from "../lib/admission-match.js";
import {normalizeAdmissionData,validateAdmission} from "../lib/admission-validation.js";
import {admissionSchema} from "../lib/admission-schema.js";
const source=p=>readFileSync(p,"utf8");
const student={id:"s1",grade:10,group:"science",roll:1,name:"রিমা",elective:"higher-math",optionalId:"biology",fourthSubject:"agriculture"};
const allMarks=(s=student)=>Object.fromEntries(getSubjects(s.grade,s.group,s.elective,s.fourthSubject).map(sub=>[sub.id,Object.fromEntries(sub.parts.map(part=>[part.key,part.max]))]));
test("grade boundaries align to 5 point grade table",()=>{
 assert.deepEqual(gradeFor(80),{letter:"A+",point:5});
 assert.deepEqual(gradeFor(70),{letter:"A",point:4});
 assert.deepEqual(gradeFor(60),{letter:"A-",point:3.5});
 assert.deepEqual(gradeFor(33),{letter:"D",point:1});
 assert.deepEqual(gradeFor(32),{letter:"F",point:0});
});
test("GPA without fourth subject is independent of absent fourth subject",()=>{
 const marks=allMarks();delete marks.biology;
 const report=evaluateTranscript(student,marks);
 assert.equal(report.withoutFourthGpa,5);
 assert.equal(report.withFourthGpa,5);
 assert.equal(report.complete,false);
 assert.ok(report.missingSubjects.includes("জীববিজ্ঞান"));
});
test("failed fourth subject does not fail required subjects and bonus is zero",()=>{
 const marks=allMarks();
 marks.biology={cq:0,mcq:0,practical:0};
 const report=evaluateTranscript(student,marks);
 assert.equal(report.complete,true);assert.equal(report.passed,true);
 assert.equal(report.withoutFourthGpa,5);assert.equal(report.withFourthGpa,5);
 assert.equal(report.bonus,0);
});
test("class 6-8 uses their actual core subject set without an invented optional subject",()=>{
 const kid={grade:7,roll:4,name:"তাসনিম"};
 const subjects=getSubjects(kid.grade);
 assert.ok(subjects.find(s=>s.id==="bangla"));
 assert.equal(subjects.some(s=>s.id==="physics"),false);
 const report=evaluateTranscript(kid,allMarks(kid));
 assert.equal(report.optionalId,null);
 assert.equal(report.withoutFourthGpa,5);assert.equal(report.withFourthGpa,5);
});
test("subject-specific highest and GPA-first rank for matching class and group only",()=>{
 const s2={...student,id:"s2",roll:2,name:"ফারিয়া"};
 const s3={...student,id:"s3",group:"business",roll:1,name:"শিলা"};
 const mk=allMarks(student);
 const all=[
 ...Object.entries(mk).map(([subjectId,scores])=>({studentId:"s1",subjectId,scores})),
 ...Object.entries(mk).map(([subjectId,scores])=>({studentId:"s2",subjectId,scores:{...scores}}))
 ];
 all.find(m=>m.studentId==="s2"&&m.subjectId==="math").scores={cq:23,mcq:10};
 const metrics=buildClassResultMetrics(student,[student,s2,s3],all);
 assert.equal(metrics.rank,1);
 assert.equal(metrics.cohortSize,2);
 assert.equal(metrics.highest.math,100);
 const bangla=getSubjects(10,"science").find(s=>s.id==="bangla");
 assert.equal(markGroupForReport(bangla).length,2);
});
test("incomplete result audit reports missing subjects, without leaking publication",()=>{
 const other={...student,id:"other",name:"অন্য"};
 const marks=Object.entries(allMarks()).map(([subjectId,scores])=>({studentId:"s1",subjectId,scores}));
 const audit=auditExamScores([student,other],marks);
 assert.equal(audit.total,2);assert.equal(audit.completeCount,1);assert.equal(audit.incompleteCount,1);
 assert.equal(audit.incomplete[0].studentId,"other");
 assert.equal(resultIsPublished({published:false},{published:true}),true);
 assert.equal(resultIsPublished({published:true},{published:false}),false);
});
test("application can match by Bangla-digit roll regardless of applicant spelling",()=>{
 const app={grade:10,group:"humanities",requestedRoll:"১",studentName:"নতুন বানান"};
 const roster=[{id:"p",name:"রোস্টারের নাম",grade:10,group:"humanities",roll:1,uid:null}];
 const found=findApplicantRosterMatch(app,roster,app.requestedRoll);
 assert.equal(found.match.id,"p");
 assert.equal(found.match.name,"রোস্টারের নাম");
 assert.deepEqual(admissionSubjects({grade:10,group:"science",optionalSubject:"agriculture"}),{
  elective:"agriculture",fourthSubject:"agriculture",optionalId:"agriculture"
 });
 assert.equal(admissionSubjects({grade:10,group:"science",optionalSubject:"biology"}).optionalId,"biology");
});
test("admission normalizes roll digits and optional subject, validates both in schema",()=>{
 const values=normalizeAdmissionData({studentName:"ছাত্রী",grade:"১০",group:"science",requestedRoll:"০০১",optionalSubject:"biology"});
 assert.equal(values.requestedRoll,"001");
 assert.equal(values.optionalSubject,"biology");
 assert.equal(admissionSchema.shape.requestedRoll.safeParse("1").success,true);
 const bad=validateAdmission({grade:"৯",group:"science",requestedRoll:"১০০০০",optionalSubject:"economics"});
 assert.ok(bad.requestedRoll);assert.ok(bad.optionalSubject);
});
test("secondary student PIN is independent per student and preserves main PIN",()=>{
 const auth=source("app/api/auth/login/route.js");
 const api=source("app/api/portal/route.js");
 assert.match(auth,/secondaryMatches/);
 assert.match(auth,/pinMatches\|\|secondaryMatches/);
 assert.doesNotMatch(auth,/studentPreviewPins/);
 assert.match(api,/student.secondaryPin.set/);
 assert.match(api,/student.secondaryPin.clear/);
 assert.match(api,/makePinCredential\(secondPin\)/);
 assert.match(api,/student.pin.reset/);
});
test("dashboard has no old import panel/hint and has learner-only PDF/publication controls",()=>{
 const portal=source("components/DashboardPortal.jsx");
 const grid=source("components/ResultEntryGrid.jsx");
 const marksheet=source("components/Marksheet.jsx");
 assert.doesNotMatch(portal,/<SelectionImportPanel/);
 assert.doesNotMatch(grid,/পুরোনো একত্রিত বাংলা নম্বর সংরক্ষিত আছে/);
 assert.match(portal,/<ResultPublishControls/);
 assert.match(portal,/<StudentResultCard/);
 assert.match(grid,/printCompactSheet/);
 assert.match(marksheet,/fatherName/);assert.match(marksheet,/motherName/);
 assert.match(marksheet,/reportPaperRows/);
 assert.match(marksheet,/row.highest/);
});
