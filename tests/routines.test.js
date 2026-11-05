import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeRoutine, routineGradeLabel } from "../lib/routines.js";

const imageUrl="https://i.ibb.co/example/hmrs-routine.png";
const valid={title:"নবম শ্রেণির ক্লাস রুটিন",kind:"class",grade:"৯",group:"science",imageUrl,published:true};

test("routine metadata accepts Bangla class numbers and Science/Business/Humanities",()=>{
 const r=normalizeRoutine(valid);
 assert.deepEqual(r,{title:valid.title,kind:"class",grade:"9",group:"science",imageUrl,published:true});
 assert.equal(routineGradeLabel("9","science"),"৯ম শ্রেণি · বিজ্ঞান");
 assert.equal(routineGradeLabel("all","all"),"সব শ্রেণি");
 assert.equal(normalizeRoutine({...valid,kind:"exam",grade:"10",group:"humanities"}).group,"humanities");
});

test("routine metadata never uses an irrelevant section or group for grades 6-8",()=>{
 const result=normalizeRoutine({...valid,grade:7,group:"science",section:"a"});
 assert.equal(result.grade,"7");
 assert.equal(result.group,"all");
 assert.equal("section" in result,false);
 assert.equal(normalizeRoutine({...valid,grade:"all",group:"business"}).group,"all");
});

test("routine upload requires safe ImgBB HTTPS image and valid fields",()=>{
 for(const imageUrl of ["","http://i.ibb.co/routine.jpg","https://example.com/a.jpg","javascript:alert(1)"]){
  assert.throws(()=>normalizeRoutine({...valid,imageUrl}),/ImgBB/);
 }
 assert.throws(()=>normalizeRoutine({...valid,kind:"other"}),/ধরন/);
 assert.throws(()=>normalizeRoutine({...valid,grade:"5"}),/শ্রেণি/);
 assert.throws(()=>normalizeRoutine({...valid,grade:"9",group:"section-a"}),/বিভাগ/);
 assert.throws(()=>normalizeRoutine({...valid,title:"a"}),/নাম/);
 assert.equal(normalizeRoutine({...valid,published:"true"}).published,false);
});

test("student deletion requires explicit boolean confirmation but no name typing",()=>{
 const source=readFileSync("app/api/portal/route.js","utf8");
 const ui=readFileSync("components/PrincipalRecordEditor.jsx","utf8");
 assert.match(source,/body\.confirmed!==true/);
 assert.doesNotMatch(source,/body\.confirmName/);
 assert.match(ui,/হ্যাঁ, ডিলিট করুন/);
 assert.doesNotMatch(ui,/নিশ্চিত করতে পুরো নাম লিখুন/);
});

test("public notices show only titles and reveal full message on click",()=>{
 const source=readFileSync("components/NoticeBoard.jsx","utf8");
 assert.match(source,/notice\.title/);
 assert.match(source,/onClick=\{\(\)=>setSelected\(notice\)\}/);
 assert.match(source,/selected\.message/);
 assert.match(source,/role="dialog"/);
});
