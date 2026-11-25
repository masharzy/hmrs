import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publicTeachers } from "../lib/public-staff.js";
import { imageType } from "../lib/image-type.js";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("publicTeachers exposes only safe display fields", () => {
  const out = publicTeachers([
    { uid: "u1", name: "রহিম", role: "teacher", phone: "01700000000", photoUrl: "https://i.ibb.co/a.jpg", teachingSubjects: [] },
    { uid: "u2", name: "করিম", role: "class_teacher", roles: ["class_teacher"], photoUrl: "javascript:alert(1)" },
    { uid: "u3", name: "নিষ্ক্রিয়", role: "teacher", active: false },
    { uid: "u4", name: "  ", role: "teacher" }
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].name, "করিম");
  assert.equal(out[0].photoUrl, "");
  assert.equal(out[1].photoUrl, "https://i.ibb.co/a.jpg");
  for (const t of out) assert.deepEqual(Object.keys(t).sort(), ["homeroom", "isClassTeacher", "name", "photoUrl", "subjects"]);
});
test("imageType recognises real images only", () => {
  assert.deepEqual(imageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])), ["jpg", "image/jpeg"]);
  assert.equal(imageType(Buffer.from("not an image at all")), null);
});
test("staff photo route is principal-only, ImgBB based and does not write settings", () => {
  const s = read("app/api/staff-photo/route.js");
  assert.match(s, /actor\.role !== "principal"/);
  assert.match(s, /uploadImageToImgBB/);
  assert.match(s, /verifyOrigin/);
  assert.doesNotMatch(s, /settings/);
});
test("public API returns teachers and up to 100 notices; UI wires it up", () => {
  const api = read("app/api/public/route.js");
  assert.match(api, /publicTeachers/);
  assert.match(api, /limit\(100\)/);
  assert.match(read("components/AccountManager.jsx"), /\/api\/staff-photo/);
  assert.match(read("components/NoticeBoard.jsx"), /notice-row-date/);
  assert.match(read("app/page.jsx"), /<HomeTeachers\/>/);
  assert.match(read("app/home.css"), /\.hmrs-home-notices \.notice-board-list\{[^}]*overflow-y:auto/);
});
