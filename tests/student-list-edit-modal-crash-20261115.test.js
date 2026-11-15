import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {enGrade} from "../lib/result-english.js";
const source=path=>readFileSync(path,"utf8");

test("student and application Edit forms resolve grade labels with imported enGrade",()=>{
 const editor=source("components/PrincipalRecordEditor.jsx");
 assert.match(editor,/import \{enGrade\} from "\.\.\/lib\/result-english\.js"/);
 assert.match(editor,/if\(key==="grade"\)return \[6,7,8,9,10\]\.map\(v=>\[String\(v\),enGrade\(v\)\]\)/);
 assert.doesNotMatch(editor,/gradeLabel\(/);
 assert.equal(enGrade("১০"),"Class 10");
 for(const n of [6,7,8,9,10])assert.equal(enGrade(n),"Class "+n);
});

test("Head Teacher Student List remains safe for legacy student missingFields types",()=>{
 const ui=source("components/DashboardPortal.jsx");
 assert.match(ui,/Array\.isArray\(s\?\.missingFields\)/);
 assert.match(ui,/missingFieldsFor\(s\)\.join/);
 assert.doesNotMatch(ui,/\(s\.missingFields\|\|\[\]\)\.join/);
 assert.match(ui,/setEditing\(null\);setDeleting\(null\)/);
});

test("student secondary PIN is optional and independent of profile edits",()=>{
 const editor=source("components/PrincipalRecordEditor.jsx");
 const portal=source("components/DashboardPortal.jsx");
 assert.match(editor,/item\.uid&&canResetPin/);
 assert.match(editor,/Secondary Login PIN \(this student only\)/);
 assert.match(editor,/onSave\(values,loginPin,resetPin,secondaryPin,removeSecondary\)/);
 assert.match(portal,/student\.secondaryPin\.set/);
 assert.match(portal,/student\.secondaryPin\.clear/);
});
