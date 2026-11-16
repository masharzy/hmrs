import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getStudentSubjects} from "../lib/academic.js";
import {buildResultSummary} from "../lib/result-summary.js";

const full=s=>Object.fromEntries(s.parts.map(p=>[p.key,p.max]));
const low=s=>Object.fromEntries(s.parts.map(p=>[p.key,0]));
function marksFor(student,{failSubject,scale}={}){
 return getStudentSubjects(student).map(s=>({studentId:student.id,subjectId:s.id,
  scores:s.id===failSubject?low(s):scale?Object.fromEntries(s.parts.map(p=>[p.key,Math.round(p.max*scale)])):full(s)}));
}
const st=(id,grade,group,extra={})=>({id,grade,group,roll:1,name:id,optionalId:grade>=9?"agriculture":undefined,...extra});

const students=[st("a",6),st("b",6),st("c",7),st("d",9,"science"),st("e",9,"business"),st("f",9,"science"),st("g",9,"humanities")];
const marks=[...marksFor(students[0]),...marksFor(students[1],{failSubject:"math"}),...marksFor(students[2],{scale:.72}),
 ...marksFor(students[3]),...marksFor(students[4],{failSubject:"english"}),...marksFor(students[5],{scale:.62})];
// g (humanities) has no marks: enrolled but not appeared.

test("all classes: class rows, 9–10 split into groups, cumulative GPA 5 / 4+ / 3+",()=>{
 const s=buildResultSummary({students,marks,grade:"all"});
 assert.equal(s.mode,"overall");
 assert.deepEqual(s.rows.map(r=>r.label),["Class 6","Class 7","Class 9","Science","Business Studies","Humanities"]);
 const c6=s.rows[0];
 assert.deepEqual([c6.enrolled,c6.appeared,c6.pass,c6.fail,c6.gpa5,c6.gpa4,c6.gpa3],[2,2,1,1,1,1,1]);
 const c7=s.rows[1];assert.deepEqual([c7.gpa5,c7.gpa4,c7.gpa3],[0,1,1],"GPA 4.x counts in 4+ and 3+");
 const hum=s.rows.find(r=>r.label==="Humanities");assert.deepEqual([hum.enrolled,hum.appeared,hum.pass,hum.fail],[1,0,0,0]);
 assert.equal(s.total.enrolled,7);assert.equal(s.total.fail,2);
 assert.deepEqual(s.columns,["Class 6","Class 7","Class 8","Class 9","Class 10"]);
 const math=s.subjects.find(x=>x.subjectId==="math");
 assert.equal(math.per[0],1);assert.equal(math.per[2],null,"no class 8 students → —");
});

test("class 6–8 has no group split; class 9 with all groups splits by group",()=>{
 const six=buildResultSummary({students,marks,grade:6});
 assert.deepEqual(six.rows.map(r=>r.label),["Class 6"]);assert.equal(six.total,null);assert.deepEqual(six.columns,[]);
 const nine=buildResultSummary({students,marks,grade:9});
 assert.deepEqual(nine.rows.map(r=>r.label),["Class 9","Science","Business Studies","Humanities"]);
 assert.deepEqual(nine.columns,["Science","Business Studies","Humanities"]);
 assert.equal(nine.subjects[0].subjectId,"english","most failed subject first");
});

test("single group and single subject views",()=>{
 const sci=buildResultSummary({students,marks,grade:9,group:"science"});
 assert.deepEqual(sci.rows.map(r=>r.label),["Class 9 · Science"]);assert.equal(sci.rows[0].enrolled,2);
 const allSci=buildResultSummary({students,marks,grade:"all",group:"science"});
 assert.deepEqual(allSci.rows.map(r=>r.label),["Class 9 · Science"],"class 6–8 excluded when a group is chosen");
 const math=buildResultSummary({students,marks,grade:"all",subjectId:"math"});
 assert.equal(math.mode,"subject");
 assert.equal(math.total.appeared,6);assert.equal(math.total.fail,1);assert.equal(math.total.grades["F"],1);
});

test("summary is wired to the marks page filters, principal only, printable in colour",()=>{
 const grid=readFileSync("components/ResultEntryGrid.jsx","utf8");
 assert.match(grid,/<option value="all">All classes<\/option>/);
 assert.match(grid,/actor\?\.role==="principal"&&<button type="button" className="btn sm primary hmrs-summary-btn"/);
 const api=readFileSync("app/api/portal/route.js","utf8");
 assert.match(api,/resource==="result\.summary"[\s\S]{0,80}needRole\(actor,\["principal"\]\)/);
 const comp=readFileSync("components/ResultSummary.jsx","utf8");
 assert.doesNotMatch(comp,/অন্তত একটি|আলাদা \(একজন/);
 assert.match(comp,/GPA 4\+/);
 const css=readFileSync("app/dashboard/results-workflow.css","utf8");
 assert.match(css,/hmrs-print-summary[\s\S]*print-color-adjust:exact/);
 const portal=readFileSync("components/DashboardPortal.jsx","utf8");
 assert.doesNotMatch(portal,/<h2>Marks<\/h2>/);
});
