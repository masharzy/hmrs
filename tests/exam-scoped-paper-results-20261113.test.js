import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getStudentSubjects,evaluateTranscript} from "../lib/academic.js";
import {examScopeGrade,examAppliesToStudent,examStudents,examScopeLabel} from "../lib/exam-scope.js";
import {resultIsPublished} from "../lib/result-publication.js";
import {reportPaperRows} from "../lib/report-paper-rows.js";
import {buildClassResultMetrics} from "../lib/result-metrics.js";
const src=p=>readFileSync(p,"utf8");
const student={id:"a",grade:10,group:"science",roll:1,name:"অর্পা",
 elective:"agriculture",fourthSubject:"agriculture",optionalId:"agriculture"};
const marksFor=s=>Object.fromEntries(getStudentSubjects(s).map(spec=>[
 spec.id,Object.fromEntries(spec.parts.map(part=>[part.key,part.max]))
]));
test("legacy exams support all classes; new exams may scope grade 6-10",()=>{
 assert.equal(examScopeGrade({}),null);
 assert.equal(examScopeGrade({scopeGrade:null}),null);
 assert.equal(examScopeGrade({scopeGrade:10}),10);
 assert.equal(examScopeLabel({scopeGrade:10}),"10ম শ্রেণি");
 const all=[{grade:6,id:"one"},{grade:10,id:"two",deleting:false},{grade:9,id:"three"}];
 assert.deepEqual(examStudents({scopeGrade:10},all).map(s=>s.id),["two"]);
 assert.equal(examAppliesToStudent({scopeGrade:6},student),false);
 assert.equal(examAppliesToStudent({scopeGrade:null},student),true);
});
test("publish all supersedes earlier one-person hide or publication",()=>{
 assert.equal(resultIsPublished({published:true},{published:false}),false);
 assert.equal(resultIsPublished({published:false},{published:true}),true);
 assert.equal(resultIsPublished({published:true,publicationVersion:3},
   {published:false,publicationVersion:2}),true);
 assert.equal(resultIsPublished({published:false,publicationVersion:4},
   {published:true,publicationVersion:3}),false);
 assert.equal(resultIsPublished({published:false,publicationVersion:4},
   {published:true,publicationVersion:4}),true);
});
test("Bangla 1st and 2nd paper each have exact CQ and MCQ and own /100 totals",()=>{
 const marks=marksFor(student);
 marks.bangla={firstCq:52,firstMcq:24,secondCq:41,secondMcq:26};
 const report=evaluateTranscript(student,marks);
 const papers=reportPaperRows(report,marks);
 const bangla=papers.filter(p=>p.subjectId==="bangla");
 assert.equal(bangla.length,2);
 assert.equal(bangla[0].paperName,"বাংলা ১ম পত্র");
 assert.equal(bangla[1].paperName,"বাংলা ২য় পত্র");
 assert.equal(bangla[0].obtained,76);
 assert.equal(bangla[0].possible,100);
 assert.deepEqual(bangla[0].parts.map(x=>[x.key,x.received]),[["firstCq",52],["firstMcq",24]]);
 assert.equal(bangla[1].obtained,67);
 assert.equal(bangla[1].possible,100);
 assert.deepEqual(bangla[1].parts.map(x=>[x.key,x.received]),[["secondCq",41],["secondMcq",26]]);
 assert.equal(report.rows.find(x=>x.subjectId==="bangla").received,143);
});
test("paper totals are never fabricated from incomplete component scores",()=>{
 const marks={bangla:{firstCq:55,secondMcq:20}};
 const papers=reportPaperRows(evaluateTranscript(student,marks),marks).filter(x=>x.subjectId==="bangla");
 assert.equal(papers[0].obtained,null);
 assert.equal(papers[1].obtained,null);
 assert.equal(papers[0].parts[0].received,55);
 assert.equal(papers[0].parts[1].received,null);
});
test("legacy combined Bangla is explicitly labelled and not split into invented paper scores",()=>{
 const marks={bangla:{cq:80,mcq:40}};
 const papers=reportPaperRows(evaluateTranscript(student,marks),marks).filter(x=>x.subjectId==="bangla");
 assert.equal(papers.length,1);
 assert.equal(papers[0].legacy,true);
 assert.match(papers[0].paperName,/পুরোনো একত্রিত/);
 assert.equal(papers[0].obtained,120);
 assert.equal(papers[0].possible,200);
});
test("cohort paper highest computed for each separate paper",()=>{
 const second={...student,id:"b",roll:2,name:"বিবি"};
 const a=marksFor(student),b=marksFor(second);
 a.bangla={firstCq:40,firstMcq:20,secondCq:30,secondMcq:10};
 b.bangla={firstCq:50,firstMcq:20,secondCq:40,secondMcq:20};
 const marks=[...Object.entries(a).map(([subjectId,scores])=>({studentId:"a",subjectId,scores})),
 ...Object.entries(b).map(([subjectId,scores])=>({studentId:"b",subjectId,scores}))];
 const metrics=buildClassResultMetrics(student,[student,second],marks);
 assert.equal(metrics.paperHighest["bangla::বাংলা ১ম পত্র"],70);
 assert.equal(metrics.paperHighest["bangla::বাংলা ২য় পত্র"],60);
 const papers=reportPaperRows(evaluateTranscript(student,a),a,metrics).filter(x=>x.subjectId==="bangla");
 assert.equal(papers[0].highest,70);
 assert.equal(papers[1].highest,60);
});
test("exam creation global, class/stream filtered individual, and paper-by-paper print",()=>{
 const portal=src("components/DashboardPortal.jsx");
 const modal=src("components/ExamCreateModal.jsx");
 const api=src("app/api/portal/route.js");
 const studentCard=src("components/StudentResultCard.jsx");
 const print=src("components/Marksheet.jsx");
 assert.match(portal,/পরীক্ষা তৈরি করুন/);
 assert.match(modal,/সব শ্রেণি/);
 assert.match(portal,/individualGrade/);
 assert.match(portal,/individualGroup/);
 assert.match(portal,/individualStudents/);
 assert.match(portal,/StudentResultCard isAdmin/);
 assert.match(portal,/mode=\{markMode\}/);
 assert.match(api,/scopeGrade:.*published:false|published:false,publicationVersion:0/);
 assert.match(api,/examAppliesToStudent/);
 assert.match(api,/publicationVersion:FieldValue.increment\(1\)/);
 assert.match(studentCard,/reportPaperRows/);
 assert.match(print,/reportPaperRows/);
});
