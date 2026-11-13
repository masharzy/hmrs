import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {normalizeSelectionPack,pickSelectionStudent,planStreamRollChanges,importedStudent,incompleteStudentFields,intendedStreamRoll,selectionMarksFor} from "../lib/selection-import.js";
import {normalizeStudentEdit} from "../lib/student-admin.js";
const read=path=>readFileSync(path,"utf8");
test("valid group roll matches existing student and corrects mismatched name",()=>{
 const students=[{id:"s",grade:10,group:"science",roll:1,name:"ভুল নাম",phone:"01712345678"}];
 const result=pickSelectionStudent({grade:10,group:"science",roll:1,name:"সঠিক নাম"},students);
 assert.equal(result.status,"matched");
 assert.equal(result.rename,true);
 assert.equal(result.student.id,"s");
 assert.equal(result.normalizeRoll,false);
});
test("a genuinely missing Excel student becomes a provisional record, never a made-up login",()=>{
 const row={grade:10,group:"humanities",roll:24,name:"আফরিন",marks:{bangla:{firstCq:45}}};
 const match=pickSelectionStudent(row,[]);
 assert.equal(match.status,"create");
 const student=importedStudent(row,"2026-11-13T00:00:00.000Z");
 assert.equal(student.grade,10);
 assert.equal(student.roll,24);
 assert.equal(student.name,"আফরিন");
 assert.equal(student.phone,"");
 assert.equal(student.uid,null);
 assert.equal(student.importIncomplete,true);
 assert.ok(student.missingFields.includes("লগইন PIN/অ্যাকাউন্ট"));
 const checked=selectionMarksFor(student,row);
 assert.equal(checked.out.length,1);
 assert.equal(checked.out[0].scores.firstCq,45);
 assert.equal(normalizeStudentEdit({...student},{allowMissingPhone:true}).phone,"");
 assert.throws(()=>normalizeStudentEdit(student),/মোবাইল/);
});
test("legacy offsets are group-specific and never convert science or other roll numbers",()=>{
 assert.equal(intendedStreamRoll(10,"business",101),1);
 assert.equal(intendedStreamRoll(10,"humanities",201),1);
 assert.equal(intendedStreamRoll(9,"business",109),9);
 assert.equal(intendedStreamRoll(10,"science",101),101);
 assert.equal(intendedStreamRoll(8,"business",101),101);
 assert.equal(intendedStreamRoll(10,"business",201),201);
});
test("bulk 101/201 correction skips collisions and leaves other grades, groups alone",()=>{
 const students=[
  {id:"a",grade:10,group:"business",roll:101,name:"রিমি"},
  {id:"b",grade:10,group:"humanities",roll:201,name:"রনি"},
  {id:"c",grade:10,group:"business",roll:102,name:"সায়রা"},
  {id:"d",grade:10,group:"business",roll:2,name:"মমতা"},
  {id:"e",grade:8,group:"business",roll:103,name:"ছাত্র"},
 ];
 const plan=planStreamRollChanges(students);
 assert.deepEqual(plan.changes.map(s=>s.id).sort(),["a","b"]);
 assert.deepEqual(plan.conflicts.map(s=>s.id),["c"]);
 assert.equal(plan.changes.find(s=>s.id==="a").roll,1);
});
test("ambiguous group-and-roll match is a conflict rather than changing someone else's profile",()=>{
 const candidates=[
  {id:"a",grade:10,group:"business",roll:1,name:"রীমা"},
  {id:"b",grade:10,group:"business",roll:101,name:"লাবণ্য"}
 ];
 const result=pickSelectionStudent({grade:10,group:"business",roll:1,name:"রীমা"},candidates);
 assert.equal(result.status,"conflict");
});
test("preview/apply accept newly created students and has independent bulk roll action",()=>{
 const api=read("app/api/selection-import/route.js");
 const panel=read("components/SelectionImportPanel.jsx");
 assert.match(api,/roll-preview/);
 assert.match(api,/roll-apply/);
 assert.match(api,/tx.create\(ref,/);
 assert.match(api,/tx.update\(ref,\{name:newName,roll:record.roll/);
 assert.match(api,/before\[part\]===undefined\|\|before\[part\]===null/);
 assert.match(api,/newStudents.length/);
 assert.match(panel,/preview.summary.create/);
 assert.match(panel,/১০১\/২০১ রোল ঠিক করুন/);
 assert.match(panel,/অনুপস্থিত শিক্ষার্থীদের অসম্পূর্ণ প্রোফাইল/);
});
test("students tab displays warning banner and icons; principal can activate incomplete login",()=>{
 const dashboard=read("components/DashboardPortal.jsx");
 const editor=read("components/PrincipalRecordEditor.jsx");
 const api=read("app/api/portal/route.js");
 assert.match(dashboard,/incompleteStudents/);
 assert.match(dashboard,/hmrs-student-warning/);
 assert.match(dashboard,/hmrs-student-incomplete-icon/);
 assert.match(editor,/loginPin/);
 assert.match(api,/action === "student.activate"/);
 assert.match(api,/makePinCredential\(pin\)/);
 assert.match(api,/loginPending:false,importIncomplete:false/);
});
