import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("homepage ticker shows 10 notices, pauses on hover and opens the notice", () => {
  const bar = read("components/HomeTopBar.jsx");
  assert.match(bar, /slice\(0, 10\)/);
  assert.match(bar, /hmrs-open-notice/);
  assert.match(read("components/NoticeBoard.jsx"), /hmrs-open-notice/);
  assert.match(read("app/home.css"), /hmrs-home-ticker:hover[^{]*\{animation-play-state:paused/);
  assert.match(read("app/page.jsx"), /<HomeTopBar\/>/);
});
test("banner and admission can be switched off by the principal; defaults stay on", () => {
  const bar = read("components/HomeTopBar.jsx");
  assert.match(bar, /bannerEnabled !== false/);
  assert.match(bar, /admissionOpen !== false/);
  const api = read("app/api/portal/route.js");
  assert.match(api, /action === "settings\.switches"[\s\S]{0,80}needRole\(actor, \["principal"\]\)/);
  assert.match(read("app/api/admissions/route.js"), /admissionOpen===false/);
  assert.match(read("app/admission/page.jsx"), /admissionOpen===false/);
});
test("student promotion is principal-only and skips class 10", () => {
  const api = read("app/api/portal/route.js");
  const i = api.indexOf('action === "student.promote"');
  assert.ok(i > 0);
  assert.match(api.slice(i, i + 300), /needRole\(actor, \["principal"\]\)/);
  assert.match(api.slice(i, i + 4000), /grade >= 10/);
  assert.match(read("components/DashboardPortal.jsx"), /<StudentPromotion/);
});
test("attendance keeps class and group (9-10) filters", () => {
  const d = read("components/DashboardPortal.jsx");
  assert.match(d, /Number\(attendanceGrade\)>=9&&<Field label="বিভাগ নির্বাচন"/);
});
test("class 10 promotion means promoted to board exam and shows green on results", () => {
  const api = read("app/api/portal/route.js");
  assert.match(api, /boardPromoted: true/);
  assert.match(read("components/StudentResultCard.jsx"), /PROMOTED TO BOARD EXAM/);
  assert.match(read("components/Marksheet.jsx"), /student\.boardPromoted/);
  assert.match(read("app/globals.css"), /hmrs-board-promoted-banner\{[^}]*#007a5e/);
});
