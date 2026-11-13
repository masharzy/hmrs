import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {studentKey,sameStudentRoll} from "../lib/school-identity.js";
import {normalizedRoles,teacherAssignments,primaryRole,teachingGrades,homeroomGrades,canManageSubject,canManageHomeroom,studentVisibleForTeaching} from "../lib/staff-permissions.js";
import {normalizeSelectionPack,pickSelectionStudent,selectionMarksFor,SELECTION_EXAM_NAME} from "../lib/selection-import.js";
const source=path=>readFileSync(path,"utf8");
test("class-10 rolls are unique by group, not merely class",()=>{
 assert.equal(studentKey(10,1,"science"),"10-science-1");
 assert.equal(studentKey("১০","১","business"),"10-business-1");
 assert.equal(studentKey(10,1,"humanities"),"10-humanities-1");
 assert.notEqual(studentKey(10,1,"science"),studentKey(10,1,"business"));
 assert.equal(studentKey(7,1),"7-1");
 assert.equal(sameStudentRoll({grade:10,group:"science",roll:1},{grade:10,group:"business",roll:1}),false);
 assert.equal(sameStudentRoll({grade:10,group:"science",roll:1},{grade:10,group:"science",roll:1}),true);
});
test("teacher and class-teacher can have both roles with independent class selections",()=>{
 const a=teacherAssignments({roles:["teacher","class_teacher"],teachingClasses:["6","10"],classTeacherClasses:["9"],teachingSubjects:["math"]});
 assert.deepEqual(a.roles,["teacher","class_teacher"]);
 assert.equal(a.role,"class_teacher");
 assert.deepEqual(a.assignedClasses,["6","10","9"]);
 assert.deepEqual(teachingGrades(a),[6,10]);
 assert.deepEqual(homeroomGrades(a),[9]);
 assert.equal(canManageHomeroom(a,9),true);
 assert.equal(canManageHomeroom(a,10),false);
 assert.equal(canManageSubject(a,{grade:10,group:"science"},"math"),true);
 assert.equal(canManageSubject(a,{grade:10,group:"science"},"physics"),false);
 assert.equal(canManageSubject(a,{grade:8},"math"),false);
 assert.equal(studentVisibleForTeaching(a,{grade:10,group:"business"}),true);
 assert.equal(studentVisibleForTeaching(a,{grade:8}),false);
});
test("legacy single staff roles remain readable",()=>{
 assert.deepEqual(normalizedRoles({role:"teacher"}),["teacher"]);
 assert.deepEqual(normalizedRoles({role:"class_teacher"}),["class_teacher"]);
 assert.equal(primaryRole(["teacher","class_teacher"]),"class_teacher");
});
test("import matches class-group-roll and legacy offset only when names agree",()=>{
 const existing=[
  {id:"s",grade:10,group:"science",roll:1,name:"তানজিলা"},
  {id:"b",grade:10,group:"business",roll:101,name:"সুমাইয়া"},
  {id:"h",grade:10,group:"humanities",roll:201,name:"শারমিন"}
 ];
 const b=pickSelectionStudent({grade:10,group:"business",roll:1,name:"সুমাইয়া"},existing);
 assert.equal(b.status,"matched");assert.equal(b.student.id,"b");assert.equal(b.normalizeRoll,true);
 assert.equal(pickSelectionStudent({grade:10,group:"humanities",roll:1,name:"শারমিন"},existing).status,"matched");
 assert.equal(pickSelectionStudent({grade:10,group:"science",roll:1,name:"সুমাইয়া"},existing).status,"review");
 assert.equal(pickSelectionStudent({grade:10,group:"science",roll:1,name:"তানজিলা"},existing).status,"matched");
});
test("selection import preserves partial marks and has no duplicate group-roll entries",()=>{
 const data={version:1,students:[
  {grade:10,group:"science",roll:1,name:"নাদিয়া",marks:{bangla:{firstMcq:16,firstCq:57},english:{first:82}}},
  {grade:10,group:"business",roll:1,name:"তানজিলা",marks:{bangla:{firstMcq:14,firstCq:30}}}
 ]};
 const normalized=normalizeSelectionPack(data);
 assert.equal(normalized.length,2);
 const computed=selectionMarksFor({grade:10,group:"science",elective:"higher-math"},normalized[0]);
 assert.equal(computed.out.length,2);
 assert.equal(computed.out[0].scores.firstMcq,16);
 assert.throws(()=>normalizeSelectionPack({...data,students:[...data.students,data.students[0]]}),/একই/);
 assert.equal(SELECTION_EXAM_NAME,"নির্বাচনী পরীক্ষা ২০২৬");
});
test("result import API has principal-only preview and never overwrites existing scores",()=>{
 const api=source("app/api/selection-import/route.js");
 assert.match(api,/needRole\(actor,\["principal"\]\)/);
 assert.match(api,/body.confirmed!==true/);
 assert.match(api,/before\[part\]===undefined\|\|before\[part\]===null/);
 assert.match(api,/store.runTransaction/);
 assert.match(api,/review/);
 const portal=source("components/DashboardPortal.jsx");
 assert.match(portal,/studentGrade/);
 assert.match(portal,/studentGroup/);
 assert.match(portal,/<SelectionImportPanel/);
 const accounts=source("components/AccountManager.jsx");
 assert.match(accounts,/teachingClasses/);assert.match(accounts,/classTeacherClasses/);
 assert.match(accounts,/roles:\["teacher"\]/);
});
