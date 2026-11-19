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

test("science without an explicit 4th subject defaults to Agricultural Studies",()=>{
 const base={grade:10,group:"science",roll:1};
 assert.equal(selectedFourthSubject(base),"agriculture");
 assert.equal(selectedFourthSubject({...base,elective:"higher-math"}),"agriculture");
 assert.equal(selectedFourthSubject({...base,elective:"higher-math",optionalId:"biology"}),"biology","explicit choice wins");
 assert.equal(selectedFourthSubject({...base,optionalSubject:"higher-math"}),"higher-math");
});

test("principal editor shows Civics/Economics for humanities and keeps it on 4th-subject change",()=>{
 const editor=readFileSync("components/PrincipalRecordEditor.jsx","utf8");
 assert.match(editor,/values\.group==="humanities"\)fields\.push\("elective"\)/);
 assert.match(editor,/fourthSubjectSelection\(next\.group,value,next\.elective\)/);
});

test("marks sheet refreshes server GPA and ranking after auto-save for all staff",()=>{
 const grid=readFileSync("components/ResultEntryGrid.jsx","utf8");
 assert.match(grid,/function refreshServerGpa\(\)/);
 assert.match(grid,/if\(savedCount\)refreshServerGpa\(\);/);
});

import {failedPartKeys,getSubjects} from "../lib/academic.js";
const subj=(g,id,grp)=>getSubjects(g,grp).find(s=>s.id===id);
test("failed mark cells are detected with the same pass rules",()=>{
 const math=subj(9,"math","science");
 assert.deepEqual([...failedPartKeys(math,{cq:22})],["cq"],"written below 23 flags as soon as entered");
 assert.deepEqual([...failedPartKeys(math,{cq:23,mcq:10})],[]);
 assert.deepEqual([...failedPartKeys(math,{cq:"",mcq:9})],["mcq"]);
 const phy=subj(10,"physics","science");
 assert.deepEqual([...failedPartKeys(phy,{cq:40,mcq:20,practical:7})],["practical"]);
 const bangla=subj(10,"bangla","science");
 assert.deepEqual([...failedPartKeys(bangla,{firstMcq:5})],[],"combined section waits for both papers");
 assert.deepEqual([...failedPartKeys(bangla,{firstCq:40,firstMcq:14,secondCq:10,secondMcq:5})].sort(),["firstMcq","secondMcq"]);
 const eng=subj(8,"english");
 assert.deepEqual([...failedPartKeys(eng,{first:40,second:9})].sort(),["first","second"]);
 const ict=subj(7,"ict");
 assert.deepEqual([...failedPartKeys(ict,{cq:3,mcq:5,practical:8})].sort(),["cq","mcq","practical"],"components pass but 16/50 < 33%");
});
test("marks register prints landscape and keeps fail colour in print",()=>{
 const grid=readFileSync("components/ResultEntryGrid.jsx","utf8");
 const css=readFileSync("app/dashboard/results-workflow.css","utf8");
 assert.match(grid,/@page\{size:landscape/);
 assert.match(grid,/hmrs-cell-fail/);
 assert.match(css,/td\.hmrs-cell-fail\{background:#fbdcdc!important;[\s\S]*print-color-adjust:exact/);
});

import {publishedStudentIds,resultIsPublished} from "../lib/result-publication.js";
test("published results are locked: whole exam, individual, and unpublish overrides",()=>{
 const exam={published:true,publicationVersion:3};
 assert.deepEqual([...publishedStudentIds(exam,[],["a","b"])],["a","b"],"publish all locks everyone");
 const hidden={studentId:"b",published:false,publicationVersion:3};
 assert.deepEqual([...publishedStudentIds(exam,[hidden],["a","b"])],["a"],"individually unpublished student is editable");
 const draft={published:false,publicationVersion:4};
 const one={studentId:"a",published:true,publicationVersion:4};
 assert.deepEqual([...publishedStudentIds(draft,[one],["a","b"])],["a"],"individual publish locks only that student");
 assert.equal(resultIsPublished(draft,null),false);
});
test("marks APIs and screens enforce the publication lock for every role",()=>{
 const api=readFileSync("app/api/portal/route.js","utf8");
 assert.doesNotMatch(api,/actor\.role!=="principal"\)return fail\("প্রকাশিত/);
 assert.match(api,/publishedStudentIds\(examSnap\.data\(\)/);
 assert.match(api,/resultIsPublished\(exam\.data\(\), publication\.exists/);
 assert.match(api,/json\(\{items:permitted,gpaByStudent,publishedIds\}\)/);
 const imp=readFileSync("app/api/selection-import/route.js","utf8");
 assert.match(imp,/PUBLISHED_LOCK_MESSAGE/);
 const grid=readFileSync("components/ResultEntryGrid.jsx","utf8");
 assert.match(grid,/disabled=\{locked\|\|loading\|\|isLocked\(student\)\}/);
 assert.doesNotMatch(grid,/exam\?\.published&&actor\?\.role!=="principal"/);
 const portal=readFileSync("components/DashboardPortal.jsx","utf8");
 assert.match(portal,/individualPublished!==false/);
});
