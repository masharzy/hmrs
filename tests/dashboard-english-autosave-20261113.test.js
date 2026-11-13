import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getStudentSubjects,validatePartialMarkForStudent} from "../lib/academic.js";
import {pendingMarkBatch,clearSavedMarkEdits,keyFor} from "../lib/marks-autosave.js";
const source=path=>readFileSync(path,"utf8");
const student={id:"s1",name:"Student",grade:10,group:"science",optionalId:"agriculture",elective:"agriculture",fourthSubject:"agriculture"};
const subjectList=getStudentSubjects(student);
const byId=new Map([[student.id,student]]);
const bySubjects=new Map([[student.id,subjectList]]);
test("auto-save handles Bengali digits, max validation, and partially filled scores",()=>{
 const key=keyFor("s1","bangla");
 const valid=pendingMarkBatch({[key]:{firstCq:"৬৫",firstMcq:"২৫"}},byId,bySubjects);
 assert.equal(valid.invalid.length,0);
 assert.deepEqual(valid.ready[0].scores,{firstCq:65,firstMcq:25});
 assert.equal(validatePartialMarkForStudent(student,"bangla",valid.ready[0].scores).firstMcq,25);
 const invalid=pendingMarkBatch({[key]:{firstCq:"750"}},byId,bySubjects);
 assert.equal(invalid.ready.length,0);assert.equal(invalid.invalid.length,1);
});
test("clearing marks stores null and keeps result incomplete, not zero as a fake entry",()=>{
 const key=keyFor("s1","bangla");
 const batch=pendingMarkBatch({[key]:{firstCq:""}},byId,bySubjects).ready;
 assert.equal(batch[0].scores.firstCq,null);
 assert.equal(validatePartialMarkForStudent(student,"bangla",batch[0].scores).firstCq,null);
 assert.deepEqual(clearSavedMarkEdits({[key]:{firstCq:""}},batch),{});
});
test("in-flight edits to the same cell survive old acknowledgement",()=>{
 const key=keyFor("s1","math");
 const sent=[{studentId:"s1",subjectId:"math",scores:{cq:20}}];
 assert.deepEqual(clearSavedMarkEdits({[key]:{cq:"21",mcq:"15"}},sent),{[key]:{cq:"21",mcq:"15"}});
 assert.deepEqual(clearSavedMarkEdits({[key]:{cq:"20",mcq:"15"}},sent),{[key]:{mcq:"15"}});
});
test("marks grid debounces auto-save and has no manual save buttons",()=>{
 const grid=source("components/ResultEntryGrid.jsx");
 const portal=source("components/DashboardPortal.jsx");
 assert.match(grid,/setTimeout\(\(\)=>\{save\(\)\},900\)/);
 assert.match(grid,/All changes saved/);
 assert.match(grid,/Retry/);
 assert.match(grid,/clearSavedMarkEdits/);
 assert.match(grid,/marks.batch/);
 assert.doesNotMatch(grid,/>Save Marks<\/button>/);
 assert.doesNotMatch(grid,/Save \{enNumber\(entries.length\)\} changes<\/button>/);
 assert.match(portal,/const quiet=action==="marks.batch"/);
});
test("dashboard navigation and student/teacher menus are in English",()=>{
 const shell=source("components/DashboardShell.jsx");
 const portal=source("components/DashboardPortal.jsx");
 const overview=source("components/DashboardOverview.jsx");
 const teacher=source("components/AccountManager.jsx");
 const student=source("components/DashboardStudentHome.jsx");
 assert.match(shell,/Back to Website/);assert.match(shell,/Navigation/);
 assert.match(portal,/Admission Approvals/);assert.match(portal,/Student Records/);
 assert.match(overview,/Total Students/);
 assert.match(teacher,/Add Teacher/);
 assert.match(student,/Student Profile/);
 assert.doesNotMatch(shell,/[\u0980-\u09ff]/);
 assert.doesNotMatch(teacher,/[\u0980-\u09ff]/);
});
