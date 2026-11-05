import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root=process.cwd();
const portal=readFileSync(root+"/components/DashboardPortal.jsx","utf8");
const shell=readFileSync(root+"/components/DashboardShell.jsx","utf8");
const overview=readFileSync(root+"/components/DashboardOverview.jsx","utf8");

test("the dashboard never displays repetitive route-update banner",()=>{
 assert.doesNotMatch(portal,/তথ্য হালনাগাদ হচ্ছে/);
 assert.match(portal,/showPlaceholder\?\s*<DashboardSkeleton/);
 assert.match(shell,/hmrs-top-progress/);
 assert.match(portal,/routeCache\.current\.has\(tab\)/);
});
test("all roles keep the same secure route navigation with mobile and desktop access",()=>{
 assert.match(shell,/hmrs-console-sidebar/);
 assert.match(shell,/hmrs-mobile-dock/);
 assert.match(shell,/hmrs-mobile-drawer/);
 assert.match(shell,/aria-current=\{active===key/);
 assert.match(portal,/onLogout=\{async/);
});
test("overview uses real summary data and fast working links, not placeholder metrics",()=>{
 assert.match(overview,/summary\[key\]/);
 assert.match(overview,/href=\{?"\/dashboard\/"\+key/);
 assert.doesNotMatch(overview,/Math\.random/);
});
test("saving attendance and marks keeps current records without resetting all route caches",()=>{
 assert.match(portal,/if\(action==="attendance\.set"\)/);
 assert.match(portal,/routeCache\.current\.set\("attendance"/);
 assert.match(portal,/if\(action==="marks\.set"\)/);
 assert.match(portal,/routeCache\.current\.set\("marks"/);
 assert.doesNotMatch(portal,/routeCache\.current\.clear\(\)/);
});
