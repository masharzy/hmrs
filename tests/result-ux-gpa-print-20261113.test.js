import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {evaluateTranscript,getStudentSubjects} from "../lib/academic.js";
import {reportPaperRows} from "../lib/report-paper-rows.js";
import {enNumber,enPaper,enPart} from "../lib/result-english.js";
const source=path=>readFileSync(path,"utf8");
const student={grade:10,group:"science",roll:4,name:"Student A",
  optionalId:"agriculture",elective:"agriculture",fourthSubject:"agriculture"};
test("missing result uses zero marks for provisional GPA, while remaining incomplete",()=>{
 const report=evaluateTranscript(student,{});
 assert.equal(report.complete,false);
 assert.equal(report.withFourthGpa,0);
 assert.equal(report.withoutFourthGpa,0);
 assert.equal(report.gpa,0);
 assert.equal(report.letter,"F");
 assert.equal(report.provisional,true);
 assert.ok(report.missingSubjects.length>2);
 assert.equal(report.rows[0].received,0);
 const paperRows=reportPaperRows(report,{});
 assert.equal(paperRows[0].obtained,0);
 assert.equal(paperRows[0].complete,false);
 assert.equal(paperRows[0].parts[0].received,0);
});
test("optional missing does not erase compulsory GPA; missing data still warns",()=>{
 const marks=Object.fromEntries(getStudentSubjects(student).filter(s=>s.id!=="agriculture")
  .map(sub=>[sub.id,Object.fromEntries(sub.parts.map(part=>[part.key,part.max]))]));
 const result=evaluateTranscript(student,marks);
 assert.equal(result.complete,false);
 assert.equal(result.provisional,true);
 assert.equal(result.withFourthGpa,5);
 assert.equal(result.withoutFourthGpa,5);
});
test("English numeral displays and per-paper headings despite Bangla digit input",()=>{
 assert.equal(enNumber("১২৩"),"123");
 assert.equal(enPaper("bangla","বাংলা ১ম পত্র"),"Bangla · Paper 1");
 assert.equal(enPaper("english","ইংরেজি ২য় পত্র"),"English · Paper 2");
 assert.equal(enPart("লিখিত","secondCq"),"CQ / Written");
});
test("publish button is conditional on exam status, and soft delete is principal-only",()=>{
 const ui=source("components/ResultPublishControls.jsx");
 const api=source("app/api/portal/route.js");
 assert.match(ui,/exam.published\?/);
 assert.match(ui,/Publish All Results/);
 assert.match(ui,/Unpublish All Results/);
 assert.match(ui,/Remove Exam/);
 assert.match(api,/action==="exam.delete"/);
 assert.match(api,/needRole\(actor,\["principal"\]\)/);
 assert.match(api,/deleted:true,published:false/);
 assert.match(api,/result.publication/);
});
test("marks sheet has no serial column, uses English, and saving does not refetch/reselect",()=>{
 const sheet=source("components/ResultEntryGrid.jsx");
 assert.doesNotMatch(sheet,/className="hmrs-sheet-sticky hmrs-sheet-serial"/);
 assert.match(sheet,/toAsciiDigits\(value\)/);
 assert.match(sheet,/enNumber\(student.roll\)/);
 assert.match(sheet,/setSheet\(old=>/);
 assert.doesNotMatch(sheet,/setRevision\(/);
 assert.match(sheet,/Marks Entry Sheet/);
});
test("student print action targets already mounted marksheet and CSS prints only that target",()=>{
 const portal=source("components/DashboardPortal.jsx");
 const css=source("app/globals.css");
 const report=source("components/Marksheet.jsx");
 assert.match(portal,/printId=\{"mark-print-"\+ex.id\}/);
 assert.match(portal,/printMarksheet\(ex.id\)/);
 assert.match(portal,/hmrs-print-target/);
 assert.match(css,/body.hmrs-print-mark .hmrs-mark-report.hmrs-print-target/);
 assert.match(report,/reportSubjectRows/);
 assert.doesNotMatch(report,/toBanglaDigits/);
});
test("secondary PIN can be set for any individual student, original is not replaced",()=>{
 const login=source("app/api/auth/login/route.js");
 const portal=source("components/DashboardPortal.jsx");
 const editor=source("components/PrincipalRecordEditor.jsx");
 const api=source("app/api/portal/route.js");
 assert.match(login,/stored\.secondary/);
 assert.match(login,/pinMatches\|\|secondaryMatches/);
 assert.doesNotMatch(login,/studentPreviewPins/);
 assert.doesNotMatch(portal,/Test PIN<\/button>/);
 assert.match(editor,/secondaryPin/);
 assert.match(api,/student.secondaryPin.clear/);
 assert.match(api,/student.secondaryPin.set/);
});
