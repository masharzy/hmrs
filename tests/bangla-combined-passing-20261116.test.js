import test from "node:test";
import assert from "node:assert/strict";
import {getStudentSubjects,evaluateSubject,evaluateTranscript} from "../lib/academic.js";
import {reportSubjectRows} from "../lib/report-subject-rows.js";
import {auditExamScores} from "../lib/result-audit.js";
const student={id:"s1",grade:10,group:"science",roll:1,
 elective:"higher-math",fourthSubject:"higher-math",optionalId:"higher-math"};
const subjects=getStudentSubjects(student);
const bangla=subjects.find(x=>x.id==="bangla");
const english=subjects.find(x=>x.id==="english");
function fillAll(){
 return Object.fromEntries(subjects.map(sub=>[sub.id,Object.fromEntries(sub.parts.map(p=>[p.key,p.max]))]));
}
test("Bangla aggregate MCQ allows 6 on paper 1 and 14 on paper 2",()=>{
 const scores={firstCq:20,secondCq:26,firstMcq:6,secondMcq:14};
 const row=evaluateSubject(bangla,scores);
 assert.equal(row.status,"complete");
 assert.equal(row.passed,true);
 assert.equal(row.received,66);
 assert.equal(row.letter,"D");
 assert.equal(row.point,1);
 const marks=fillAll();marks.bangla=scores;
 const result=evaluateTranscript(student,marks);
 assert.equal(result.passed,true);
 assert.equal(result.rows.find(x=>x.subjectId==="bangla").letter,"D");
 assert.ok(result.gpa>0);
 assert.equal(reportSubjectRows(result,marks).find(x=>x.id==="bangla").grade,"D");
 assert.equal(auditExamScores([student],Object.entries(marks).map(([subjectId,scores])=>({
  studentId:student.id,subjectId,scores
 }))).completeCount,1);
});
test("first paper MCQ can be below 10 when second makes 20/60",()=>{
 const scores={firstCq:50,secondCq:50,firstMcq:0,secondMcq:20};
 assert.equal(evaluateSubject(bangla,scores).passed,true);
});
test("6 plus 12 is 18/60, still below HMRS current 20/60 combined minimum",()=>{
 const scores={firstCq:70,secondCq:70,firstMcq:6,secondMcq:12};
 const row=evaluateSubject(bangla,scores);
 assert.equal(row.status,"complete");
 assert.equal(row.received,158);
 assert.equal(row.passed,false);
 assert.equal(row.letter,"F");
});
test("combined written 46/140 must pass regardless of individual paper written score",()=>{
 assert.equal(evaluateSubject(bangla,{firstCq:0,secondCq:46,firstMcq:10,secondMcq:10}).passed,true);
 assert.equal(evaluateSubject(bangla,{firstCq:22,secondCq:23,firstMcq:30,secondMcq:30}).passed,false);
});
test("English is graded on combined 200 marks, no separate paper pass",()=>{
 const row=evaluateSubject(english,{first:0,second:66});
 assert.equal(row.received,66);
 assert.equal(row.passed,true);
 assert.equal(row.letter,"D");
});
test("Legacy combined Bangla scores still use 46/140 and 20/60",()=>{
 assert.equal(evaluateSubject(bangla,{cq:46,mcq:20}).passed,true);
 assert.equal(evaluateSubject(bangla,{cq:100,mcq:18}).passed,false);
});
test("Regular CQ/MCQ/practical subjects retain separate component pass thresholds",()=>{
 const math=subjects.find(x=>x.id==="math");
 const physics=subjects.find(x=>x.id==="physics");
 assert.equal(evaluateSubject(math,{cq:22,mcq:20}).passed,false);
 assert.equal(evaluateSubject(math,{cq:23,mcq:10}).passed,true);
 assert.equal(evaluateSubject(physics,{cq:17,mcq:8,practical:7}).passed,false);
 assert.equal(evaluateSubject(physics,{cq:17,mcq:8,practical:8}).passed,true);
});
test("Incomplete Bangla scores remain incomplete; no invented pass result",()=>{
 assert.equal(evaluateSubject(bangla,{firstCq:70,secondCq:70,firstMcq:6}).status,"missing");
});
