import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {evaluateTranscript,getStudentSubjects} from "../lib/academic.js";
import {failedSubjectCount,formatResultGpa} from "../lib/result-display.js";
import {buildCohortRankings} from "../lib/result-metrics.js";
import {buildResultSummary} from "../lib/result-summary.js";

const student=(id,roll,grade=7,extras={})=>({id,roll,grade,name:"Student "+id,...extras});
const full=s=>Object.fromEntries(s.parts.map(p=>[p.key,p.max]));
const zero=s=>Object.fromEntries(s.parts.map(p=>[p.key,0]));
const everyMark=(st,omitId="",failedId="")=>getStudentSubjects(st)
 .filter(s=>s.id!==omitId)
 .map(s=>({studentId:st.id,subjectId:s.id,scores:s.id===failedId?zero(s):full(s)}));
const toMap=(marks,id)=>Object.fromEntries(marks.filter(x=>x.studentId===id).map(x=>[x.subjectId,x.scores]));

test("unentered marks count as failed compulsory subjects, without saving artificial zeroes",()=>{
 const st=student("empty",1);
 const report=evaluateTranscript(st,{});
 assert.equal(report.complete,false);
 assert.equal(report.gpa,0);
 assert.equal(failedSubjectCount(report),getStudentSubjects(st).length);
 assert.equal(formatResultGpa(report),"F"+getStudentSubjects(st).length);
});

test("one missing subject is F1, while zero-mark submitted subject is also F1",()=>{
 const a=student("missing",2),b=student("zero",3);
 const missingMarks=everyMark(a,"math");
 const failedMarks=everyMark(b,"","math");
 const rm=evaluateTranscript(a,toMap(missingMarks,a.id));
 const rz=evaluateTranscript(b,toMap(failedMarks,b.id));
 assert.equal(failedSubjectCount(rm),1);
 assert.equal(failedSubjectCount(rz),1);
 assert.equal(formatResultGpa(rm),"F1");
 assert.equal(formatResultGpa(rz,"withoutFourthGpa"),"F1");
 assert.equal(rm.complete,false);
 assert.equal(rz.complete,true);
});

test("ninth-tenth fourth subject is NOT a failure even when unentered or failed",()=>{
 const st=student("ninth",1,9,{group:"science",optionalId:"agriculture",elective:"agriculture"});
 const fourth=getStudentSubjects(st).find(s=>s.id==="agriculture");
 assert.ok(fourth);
 const marks=everyMark(st,"agriculture");
 const r=evaluateTranscript(st,toMap(marks,st.id));
 assert.equal(r.passed,true);
 assert.equal(failedSubjectCount(r),0);
 assert.equal(formatResultGpa(r),"5.00");
 const enteredFourth=[...marks,{studentId:st.id,subjectId:"agriculture",scores:zero(fourth)}];
 const f=evaluateTranscript(st,toMap(enteredFourth,st.id));
 assert.equal(f.passed,true);
 assert.equal(failedSubjectCount(f),0);
});

test("F1/F2/... summary lists only selected students with roll and name; blank enrollee is included",()=>{
 const none=student("none",7),once=student("once",5),twice=student("twice",3),ok=student("ok",9);
 const students=[none,once,twice,ok];
 const marks=[...everyMark(once,"math"),...everyMark(twice,"math").filter(m=>m.subjectId!=="english"),...everyMark(ok)];
 const summary=buildResultSummary({students,marks,grade:7});
 const totalRequired=getStudentSubjects(none).length;
 assert.deepEqual(summary.failGroups.map(g=>g.count),[1,2,totalRequired]);
 assert.deepEqual(summary.failGroups[0].students.map(x=>[x.roll,x.name]),[[5,"Student once"]]);
 assert.deepEqual(summary.failGroups[1].students.map(x=>x.roll),[3]);
 assert.deepEqual(summary.failGroups[2].students.map(x=>x.roll),[7]);
 assert.deepEqual([summary.rows[0].enrolled,summary.rows[0].appeared,summary.rows[0].pass,summary.rows[0].fail],[4,3,1,3]);
 const math=buildResultSummary({students,marks,grade:7,subjectId:"math"});
 assert.equal(math.rows[0].eligible,4);
 assert.equal(math.rows[0].appeared,1);
 assert.equal(math.rows[0].fail,3);
});

test("ranking follows class/group, total marks and complete-only policy",()=>{
 const first=student("first",2),second=student("second",1),empty=student("empty",3);
 const marks=[...everyMark(first),...everyMark(second)];
 const entries=[first,second,empty].map(st=>({student:st,report:evaluateTranscript(st,toMap(marks,st.id))}));
 const r=buildCohortRankings(entries);
 assert.deepEqual([r.second.rank,r.first.rank,r.empty.rank],[1,2,null]);
 assert.equal(r.first.rankOf,2);
 assert.equal(r.empty.rankOf,2);
});

test("head-teacher register and student documents use shared F-count formatting",()=>{
 const grid=readFileSync("components/ResultEntryGrid.jsx","utf8");
 assert.match(grid,/hmrs-sheet-gpa">GPA<\/th>[\s\S]*?hmrs-sheet-rank">Ranking<\/th>/);
 assert.match(grid,/formatResultGpa\(shownReport\)/);
 assert.match(grid,/studentRanks/);
 const comp=readFileSync("components/ResultSummary.jsx","utf8");
 assert.match(comp,/s\.failGroups\?\.length/);
 assert.match(comp,/hmrs-fail-cells/);
 assert.match(comp,/bucket.students.map\(st=>/);
 const printed=readFileSync("components/Marksheet.jsx","utf8");
 assert.match(printed,/formatResultGpa\(result,"withFourthGpa"\)/);
});

test("scrollbar interaction does not dismiss the summary modal; fail groups are compact",()=>{
 const comp=readFileSync("components/ResultSummary.jsx","utf8");
 const css=readFileSync("app/dashboard/results-workflow.css","utf8");
 assert.doesNotMatch(comp,/hmrs-summary-backdrop" onMouseDown=/);
 assert.match(comp,/className="hmrs-summary-backdrop"/);
 assert.match(comp,/onClick=\{onClose\}/);
 assert.match(comp,/if\(e.key==="Escape"\)onClose\(\)/);
 assert.doesNotMatch(comp,/Missing marks count as failed subjects/);
 assert.doesNotMatch(comp,/hmrs-summary-fail-group/);
 assert.match(comp,/hmrs-fail-compact/);
 assert.match(comp,/hmrs-fail-cell/);
 assert.match(comp,/<b>\{num\(st.roll\)\}<\/b><span>\{st.name\}<\/span>/);
 assert.match(css,/hmrs-summary\{[^}]*overflow:auto/);
 assert.match(css,/hmrs-fail-cells\{display:grid/);
});
