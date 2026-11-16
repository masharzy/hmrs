import test from "node:test";
import assert from "node:assert/strict";
import {getSubjects,evaluateSubject,evaluateTranscript} from "../lib/academic.js";
import {buildClassResultMetrics} from "../lib/result-metrics.js";
import {reportSubjectRows} from "../lib/report-subject-rows.js";
import {reportPaperRows} from "../lib/report-paper-rows.js";

const sub=(grade,id,group)=>getSubjects(grade,group).find(s=>s.id===id);
const full=s=>Object.fromEntries(s.parts.map(p=>[p.key,p.max]));

test("class 6-8 theory subjects pass written and MCQ separately (70/23, 30/10)",()=>{
 for(const id of ["math","science","bgs","religion"]){
  const s=sub(7,id);
  assert.deepEqual(s.parts.map(p=>[p.key,p.max,p.pass]),[["cq",70,23],["mcq",30,10]]);
  assert.equal(evaluateSubject(s,{cq:60,mcq:9}).passed,false,id+" MCQ below 10 fails");
  assert.equal(evaluateSubject(s,{cq:22,mcq:30}).passed,false,id+" written below 23 fails");
  assert.equal(evaluateSubject(s,{cq:23,mcq:10}).passed,true,id+" minimums pass");
 }
});

test("class 6-8 Bangla: written and MCQ pass across both papers (105→35, 45→15)",()=>{
 const s=sub(6,"bangla");
 assert.equal(s.max,150);
 // 2nd-paper MCQ alone below its share is fine when the combined MCQ is 15+.
 assert.equal(evaluateSubject(s,{firstCq:30,firstMcq:13,secondCq:5,secondMcq:2}).passed,true);
 assert.equal(evaluateSubject(s,{firstCq:30,firstMcq:12,secondCq:5,secondMcq:2}).passed,false,"MCQ 14/45 fails");
 assert.equal(evaluateSubject(s,{firstCq:30,firstMcq:20,secondCq:4,secondMcq:5}).passed,false,"written 34/105 fails");
});

test("class 9-10 Bangla keeps combined 46/140 written and 20/60 MCQ",()=>{
 const s=sub(9,"bangla","science");
 assert.equal(evaluateSubject(s,{firstCq:40,firstMcq:15,secondCq:6,secondMcq:5}).passed,true);
 assert.equal(evaluateSubject(s,{firstCq:40,firstMcq:14,secondCq:6,secondMcq:5}).passed,false);
});

test("English pairs need 33% of the combined total only (150→50, 200→66)",()=>{
 assert.equal(evaluateSubject(sub(8,"english"),{first:45,second:5}).passed,true);
 assert.equal(evaluateSubject(sub(8,"english"),{first:44,second:5}).passed,false);
 assert.equal(evaluateSubject(sub(10,"english","science"),{first:60,second:6}).passed,true);
 assert.equal(evaluateSubject(sub(10,"english","science"),{first:60,second:5}).passed,false);
});

test("practical subjects and ICT pass every component separately",()=>{
 const phy=sub(10,"physics","science");
 assert.deepEqual(phy.parts.map(p=>[p.max,p.pass]),[[50,17],[25,8],[25,8]]);
 assert.equal(evaluateSubject(phy,{cq:50,mcq:7,practical:25}).passed,false);
 const ict910=sub(9,"ict","science");
 assert.deepEqual(ict910.parts.map(p=>[p.key,p.max,p.pass]),[["mcq",25,8],["practical",25,8]]);
 const ict68=sub(6,"ict");
 assert.deepEqual(ict68.parts.map(p=>[p.key,p.max,p.pass]),[["cq",10,3],["mcq",15,5],["practical",25,8]]);
 assert.equal(evaluateSubject(ict68,{cq:2,mcq:15,practical:25}).passed,false);
});

test("old class 6-8 single totals stay calculable and are shown as legacy",()=>{
 const s=sub(8,"math");
 const r=evaluateSubject(s,{total:72});
 assert.equal(r.status,"complete");assert.equal(r.legacy,true);assert.equal(r.letter,"A");
 const oldBangla=evaluateSubject(sub(8,"bangla"),{first:80,second:40});
 assert.equal(oldBangla.status,"complete");assert.equal(oldBangla.received,120);
 // Once any new cell is entered, the new layout is required (no mixing).
 assert.equal(evaluateSubject(s,{total:72,cq:50}).status,"missing");
 const student={id:"x",grade:8,roll:1};
 const marks={math:{total:72}};
 const report=evaluateTranscript(student,marks);
 const row=reportSubjectRows(report,marks).find(r=>r.id==="math");
 assert.equal(row.legacy,true);assert.equal(row.obtained,72);
 const paper=reportPaperRows(report,marks).find(p=>p.subjectId==="math");
 assert.equal(paper.obtained,72);assert.match(paper.paperName,/পুরোনো/);
});

const kid=(id,roll)=>({id,roll,grade:7,name:id});
const marksFor=(studentId,scale=1,fail=false)=>getSubjects(7).map(s=>({studentId,subjectId:s.id,
 scores:Object.fromEntries(s.parts.map(p=>[p.key,fail&&s.id==="math"&&p.key==="mcq"?0:Math.round(p.max*scale)]))}));

test("ranking is by total marks; ties keep smaller roll first; positions sequential",()=>{
 const a=kid("a",1),b=kid("b",3),c=kid("c",2);
 const marks=[...marksFor("a",0.9),...marksFor("b",0.9),...marksFor("c",0.7)];
 const all=[a,b,c];
 assert.equal(buildClassResultMetrics(a,all,marks).rank,1);
 assert.equal(buildClassResultMetrics(b,all,marks).rank,2,"roll 3 tied with roll 1 becomes 2nd");
 assert.equal(buildClassResultMetrics(c,all,marks).rank,3);
});

test("failed students keep an overall position but have no merit position",()=>{
 const top=kid("top",5),failer=kid("failer",1),low=kid("low",2);
 // failer has high total but 0 in maths MCQ → fails overall.
 const marks=[...marksFor("top",0.95),...marksFor("failer",0.9,true),...marksFor("low",0.5)];
 const all=[top,failer,low];
 const f=buildClassResultMetrics(failer,all,marks);
 assert.equal(evaluateTranscript(failer,Object.fromEntries(marks.filter(m=>m.studentId==="failer").map(m=>[m.subjectId,m.scores]))).passed,false);
 assert.equal(f.rank,2);assert.equal(f.rankOf,3);
 assert.equal(f.meritRank,null);assert.equal(f.meritOf,2);
 const l=buildClassResultMetrics(low,all,marks);
 assert.equal(l.rank,3);assert.equal(l.meritRank,2);
});

test("fourth subject marks count in full toward the ranking total",()=>{
 const s1={id:"s1",roll:1,grade:9,group:"science",optionalId:"higher-math"};
 const s2={...s1,id:"s2",roll:2};
 const mk=(id,hm)=>getSubjects(9,"science").map(s=>({studentId:id,subjectId:s.id,
  scores:s.id==="higher-math"?{cq:hm,mcq:hm/2,practical:hm/2}:full(s)}));
 const marks=[...mk("s1",20),...mk("s2",50)];
 assert.equal(buildClassResultMetrics(s2,[s1,s2],marks).rank,1,"higher 4th-subject marks put roll 2 first");
});
