import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getStudentSubjects,evaluateTranscript} from "../lib/academic.js";
import {reportSubjectRows} from "../lib/report-subject-rows.js";
const read=path=>readFileSync(path,"utf8");
const student={id:"one",name:"A",grade:10,group:"science",roll:1,
 optionalId:"agriculture",elective:"agriculture",fourthSubject:"agriculture"};
const complete=s=>Object.fromEntries(getStudentSubjects(s).map(x=>[
 x.id,Object.fromEntries(x.parts.map(p=>[p.key,p.max]))]));
test("Bangla 1st and 2nd papers become one /200 subject with one grade and expandable details",()=>{
 const marks=complete(student);
 marks.bangla={firstCq:66,firstMcq:27,secondCq:55,secondMcq:22};
 marks.english={first:82,second:81};
 const result=evaluateTranscript(student,marks);
 const rows=reportSubjectRows(result,marks,{highest:{bangla:183,english:188}});
 const bangla=rows.filter(x=>x.id==="bangla"),english=rows.filter(x=>x.id==="english");
 assert.equal(bangla.length,1);
 assert.equal(bangla[0].name,"বাংলা");
 assert.equal(bangla[0].obtained,170);assert.equal(bangla[0].max,200);
 assert.deepEqual(bangla[0].written,{obtained:121,max:140});
 assert.deepEqual(bangla[0].mcq,{obtained:49,max:60});
 assert.equal(bangla[0].grade,"A+");assert.equal(bangla[0].highest,183);
 assert.equal(bangla[0].papers.length,2);
 assert.equal(bangla[0].papers[0].obtained,93);
 assert.equal(bangla[0].papers[1].obtained,77);
 assert.equal(english.length,1);assert.equal(english[0].obtained,163);
 assert.equal(english[0].max,200);assert.equal(english[0].grade,"A+");
 assert.equal(english[0].papers.length,2);
});
test("legacy combined Bangla keeps one /200 grade, no invented papers",()=>{
 const marks=complete(student);marks.bangla={cq:80,mcq:40};
 const rows=reportSubjectRows(evaluateTranscript(student,marks),marks);
 const bangla=rows.find(x=>x.id==="bangla");
 assert.equal(bangla.obtained,120);assert.equal(bangla.max,200);
 assert.equal(bangla.grade,"A-");assert.equal(bangla.papers.length,0);
});
test("student screen expands separate paper details; printed marksheet never shows them",()=>{
 const ui=read("components/StudentResultCard.jsx"),pdf=read("components/Marksheet.jsx");
 assert.match(ui,/View papers/);assert.match(ui,/expanded\[row.id\]/);
 assert.match(ui,/row.papers.map/);
 assert.match(ui,/row.grade/);
 assert.match(pdf,/reportSubjectRows/);
 assert.doesNotMatch(pdf,/row.papers.map/);
 assert.doesNotMatch(pdf,/View papers/);
 assert.doesNotMatch(pdf,/<th>GP<\/th>/);
});
test("each class register row has GPA in the final column, including unsaved scores",()=>{
 const grid=read("components/ResultEntryGrid.jsx");
 assert.match(grid,/studentGpas=useMemo/);
 assert.match(grid,/evaluateTranscript\(student,markMap\)/);
 assert.match(grid,/<th rowSpan=\{2\} className="hmrs-sheet-gpa">GPA<\/th>/);
 assert.match(grid,/studentGpas.get\(student.id\)/);
 assert.match(grid,/serverGpa\[student.id\]/);
 assert.match(grid,/<td className="hmrs-sheet-gpa"/);
});
test("Exams and Marks are distinct routes with exam edit/delete and protected scope",()=>{
 const portal=read("components/DashboardPortal.jsx"),manager=read("components/ExamManager.jsx");
 const api=read("app/api/portal/route.js"),data=read("lib/dashboard-data.js");
 const route=read("app/dashboard/[section]/page.jsx");
 assert.match(portal,/"exams","Exams"/);
 assert.match(portal,/"marks","Marks"/);
 assert.match(route,/"exams"/);
 assert.match(data,/if\(section==="exams"\)/);
 assert.match(manager,/Edit<\/button>/);
 assert.match(manager,/Delete<\/button>/);
 assert.match(api,/action==="exam.update"/);
 assert.match(api,/Cannot change exam class after marks have been entered/);
 assert.match(api,/action==="exam.delete"/);
});
test("exam selection refreshes only sheet and never collapses the whole dashboard page",()=>{
 const grid=read("components/ResultEntryGrid.jsx"),portal=read("components/DashboardPortal.jsx");
 assert.match(portal,/section==="attendance"\?"attendance:"\+date:section;/);
 assert.match(grid,/hmrs-grid-refresh/);
 assert.doesNotMatch(grid,/:loading\?<p role="status" className="empty">Loading marks/);
 assert.match(grid,/disabled=\{locked\|\|loading\}/);
});
test("print is landscape, fitted to all spreadsheet columns; subject names remain Bangla",()=>{
 const css=read("app/dashboard/results-workflow.css");
 const grid=read("components/ResultEntryGrid.jsx");
 assert.match(css,/@page hmrs-sheet-print\{size:A3 landscape/);
 assert.match(css,/table-layout:fixed!important/);
 assert.match(css,/min-width:0!important/);
 assert.match(grid,/subject.name/);
 assert.doesNotMatch(grid,/const name=paper\?enPaper/);
});
test("Routines are absent from home and dashboard; notice section remains",()=>{
 const home=read("app/page.jsx"),header=read("components/SiteHeader.jsx");
 const portal=read("components/DashboardPortal.jsx"),shell=read("components/DashboardShell.jsx");
 assert.doesNotMatch(home,/<RoutineBoard/);
 assert.match(home,/<NoticeBoard full/);
 assert.doesNotMatch(header,/"\/#routines"/);
 assert.doesNotMatch(shell,/,"routines",/);
 assert.doesNotMatch(portal,/\["routines","Routines"/);
});
test("student must choose a published exam before its result is shown",()=>{
 const portal=read("components/DashboardPortal.jsx");
 assert.match(portal,/selectedPublishedExam/);
 assert.match(portal,/setSelectedPublishedExam\(ex.id\)/);
 assert.match(portal,/profile.results.filter\(x=>x.exam.id===selectedPublishedExam\)/);
 assert.match(portal,/setSelectedPublishedExam\(""\)/);
});
