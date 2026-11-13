import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=path=>readFileSync(path,"utf8");
const portal=read("components/DashboardPortal.jsx");
const api=read("app/api/portal/route.js");
const data=read("lib/dashboard-data.js");
const shell=read("components/DashboardShell.jsx");

test("dashboard API authorizes students before its staff-only resource guard",()=>{
 const dashboard=api.indexOf('if (resource === "dashboard.data")');
 const guard=api.indexOf("needRole(actor, allowedStaff);");
 assert.ok(dashboard>0&&guard>dashboard);
 assert.match(data,/student:\["overview","records","results","profile"\]/);
});

test("attendance caches by date while marks route stays mounted across exam selection",()=>{
 assert.match(portal,/section==="attendance"\?"attendance:"\+date/);
 assert.doesNotMatch(portal,/section==="marks"\?"marks:"\+\(examId\|\|"none"\)/);
 assert.match(portal,/section==="attendance"\?"attendance:"\+date:section/);
 assert.match(portal,/routeCache\.current\.set\(key,\{\.\.\.current,data:/);
 assert.doesNotMatch(portal,/data\.attendance\?\.find\(a=>a\.studentId===s\.id\)/);
 assert.match(portal,/attendanceByStudent=useMemo/);
});

test("native-history nav supports all direct dashboard routes including profile",()=>{
 assert.match(shell,/window\.history\.pushState/);
 assert.match(shell,/"results","profile"\]/);
 assert.match(read("app/dashboard/[section]/page.jsx"),/"results","profile"\]/);
});

test("routine and notice save responses enable local cache updates",()=>{
 assert.match(api,/routine:\{id:ref\.id/);
 assert.match(api,/notice:\{id:ref\.id/);
 assert.match(portal,/action==="routine\.save"/);
 assert.match(portal,/action==="notice\.save"/);
 assert.match(read("components/RoutineManager.jsx"),/selectedFile\?await upload\(\):form\.imageUrl/);
});

test("only principal can upload notice images and PDF; PDF uses R2",()=>{
 const upload=read("app/api/notice-attachment/route.js");
 assert.match(upload,/actor\.role!=="principal"/);
 assert.match(upload,/verifyOrigin\(req\)/);
 assert.match(upload,/CLOUDFLARE_R2_API_TOKEN/);
 assert.match(upload,/\%PDF-/);
 assert.match(upload,/bytes\.subarray\(0,5\)/);
 assert.match(api,/pdfUrl=cleanText/);
 assert.match(read("components/NoticeBoard.jsx"),/selected\.pdfUrl/);
 assert.match(read("components/NoticeBoard.jsx"),/selected\.imageUrl/);
});

test("PIN changes are authenticated, old PIN verified and sessions revoked",()=>{
 assert.match(api,/action === "pin\.change"/);
 assert.match(api,/verifyPin\(oldPin,oldSnap\.data\(\)\)/);
 assert.match(api,/revokeRefreshTokens\(actor\.uid\)/);
 assert.match(read("components/ChangePinForm.jsx"),/oldPin===newPin/);
 for(const role of ["student","teacher","class_teacher","principal"]){
  assert.match(data,new RegExp(role+':\\[[^\\n]*"profile"'));
 }
});
