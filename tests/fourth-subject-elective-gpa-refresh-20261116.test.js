import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fourthSubjectSelection,selectedFourthSubject,getStudentSubjects} from "../lib/academic.js";
import {admissionSubjects} from "../lib/admission-match.js";
import {TEACHER_SUBJECT_IDS} from "../lib/teacher-subjects.js";

const ids=s=>getStudentSubjects(s).map(x=>x.id);
const humanities={grade:9,group:"humanities",roll:1,name:"শিক্ষার্থী"};

test("humanities Economics students keep Economics, not Civics",()=>{
 const s={...humanities,elective:"economics",optionalId:"agriculture"};
 assert.ok(ids(s).includes("economics"));
 assert.equal(ids(s).includes("civics"),false);
 assert.equal(fourthSubjectSelection("humanities","home-science","economics").elective,"economics");
 assert.equal(fourthSubjectSelection("humanities","home-science","bad").elective,"civics");
 assert.equal(admissionSubjects({grade:9,group:"humanities",optionalSubject:"agriculture",elective:"economics"}).elective,"economics");
 assert.ok(ids({...humanities,optionalId:"agriculture"}).includes("civics"),"no choice still defaults to Civics");
 assert.ok(TEACHER_SUBJECT_IDS.has("economics"),"teachers can be assigned Economics");
});

test("old science records use their stored elective as the 4th subject",()=>{
 const base={grade:10,group:"science",roll:1};
 assert.equal(selectedFourthSubject({...base,elective:"higher-math"}),"higher-math");
 assert.equal(selectedFourthSubject({...base,elective:"agriculture"}),"agriculture");
 assert.equal(selectedFourthSubject({...base,elective:"higher-math",optionalId:"biology"}),"biology","explicit choice wins");
});

test("principal editor shows Civics/Economics for humanities and keeps it on 4th-subject change",()=>{
 const editor=readFileSync("components/PrincipalRecordEditor.jsx","utf8");
 assert.match(editor,/values\.group==="humanities"\)fields\.push\("elective"\)/);
 assert.match(editor,/fourthSubjectSelection\(next\.group,value,next\.elective\)/);
});

test("teacher marks sheet refreshes server GPA after auto-save",()=>{
 const grid=readFileSync("components/ResultEntryGrid.jsx","utf8");
 assert.match(grid,/function refreshServerGpa\(\)/);
 assert.match(grid,/if\(savedCount&&actor\?\.role!=="principal"\)refreshServerGpa\(\);/);
});
