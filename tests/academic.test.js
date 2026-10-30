import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateSubject, evaluateTranscript, getSubjects, validateMarkForStudent } from "../lib/academic.js";

test("grade 6 Bangla papers combine and 33% threshold is inclusive", () => {
  const s = getSubjects(6).find(s => s.id === "bangla");
  assert.equal(evaluateSubject(s, { first: 30, second: 19 }).passed, false);
  assert.equal(evaluateSubject(s, { first: 30, second: 20 }).passed, true);
});
test("grade 9 theoretical component fail even with total 33", () => {
  const math = getSubjects(9).find(s => s.id === "math");
  assert.equal(evaluateSubject(math, { cq: 22, mcq: 20 }).passed, false);
  assert.equal(evaluateSubject(math, { cq: 23, mcq: 10 }).passed, true);
});
test("science practical demands all three minimums", () => {
  const physics = getSubjects(9).find(s => s.id === "physics");
  assert.equal(evaluateSubject(physics, { cq: 16, mcq: 16, practical: 20 }).passed, false);
  assert.equal(evaluateSubject(physics, { cq: 17, mcq: 8, practical: 8 }).passed, true);
});
test("Bangla 200 must meet combined CQ and MCQ thresholds", () => {
  const bangla = getSubjects(10).find(s => s.id === "bangla");
  assert.equal(evaluateSubject(bangla, { cq: 45, mcq: 30 }).passed, false);
  assert.equal(evaluateSubject(bangla, { cq: 46, mcq: 20 }).passed, true);
});
test("ICT 50 requires MCQ and practical separately", () => {
  const ict = getSubjects(10).find(s => s.id === "ict");
  assert.equal(evaluateSubject(ict, { mcq: 7, practical: 25 }).passed, false);
  assert.equal(evaluateSubject(ict, { mcq: 8, practical: 8 }).passed, false);
  assert.equal(evaluateSubject(ict, { mcq: 17, practical: 8 }).passed, true);
});
test("grade 6 transcript aggregates no elective bonus", () => {
  const student = { grade: 6 };
  const marks = {};
  for (const s of getSubjects(6)) marks[s.id] = Object.fromEntries(s.parts.map(p => [p.key, p.max]));
  const r = evaluateTranscript(student, marks);
  assert.equal(r.passed, true);
  assert.equal(r.gpa, 5);
});
test("fourth subject grade F does not fail compulsory subjects", () => {
  const student = { grade: 9, group: "business", elective: "agriculture", optionalId: "agriculture" };
  const marks = {};
  for (const s of getSubjects(9, "business", "agriculture")) marks[s.id] = Object.fromEntries(s.parts.map(p => [p.key, s.id === "agriculture" ? 0 : p.max]));
  const r = evaluateTranscript(student, marks);
  assert.equal(r.passed, true);
  assert.equal(r.gpa, 5);
});
test("transcript remains incomplete if any subject missing", () => {
  assert.equal(evaluateTranscript({ grade: 6 }, {}).complete, false);
});

test("overall GPA letter is not derived from raw marks percentage", () => {
 const student = { grade: 6 };
 const marks = {};
 for (const s of getSubjects(6)) {
   // 70% of each subject means GP 4 / overall letter A
   marks[s.id] = Object.fromEntries(s.parts.map(p => [p.key, p.max * 0.7]));
 }
 const r = evaluateTranscript(student, marks);
 assert.equal(r.gpa, 4);
 assert.equal(r.letter, "A");
});

test("higher math in grades 9 and 10 has the same CQ, MCQ and practical breakdown as physics", () => {
  for (const grade of [9, 10]) {
    const subjects = getSubjects(grade, "science", "higher-math");
    const higherMath = subjects.find(s => s.id === "higher-math");
    const physics = subjects.find(s => s.id === "physics");
    assert.deepEqual(higherMath.parts, physics.parts);
    assert.deepEqual(higherMath.parts.map(p => [p.key, p.max, p.pass]), [
      ["cq", 50, 17], ["mcq", 25, 8], ["practical", 25, 8]
    ]);
    assert.equal(higherMath.max, 100);
    assert.equal(evaluateSubject(higherMath, { cq: 17, mcq: 8, practical: 8 }).passed, true);
    assert.equal(evaluateSubject(higherMath, { cq: 18, mcq: 8, practical: 7 }).passed, false);
    assert.equal(evaluateSubject(higherMath, { cq: 50, mcq: 25 }).status, "missing");
  }
});

test("higher math mark submission requires and validates practical marks", () => {
  for (const grade of [9, 10]) {
    const student = { grade, group: "science", elective: "higher-math" };
    assert.throws(() => validateMarkForStudent(student, "higher-math", { cq: 50, mcq: 25 }), /নম্বর সঠিক নয়/);
    assert.throws(() => validateMarkForStudent(student, "higher-math", { cq: 50, mcq: 25, practical: 26 }), /নম্বর সঠিক নয়/);
    const result = validateMarkForStudent(student, "higher-math", { cq: 40, mcq: 20, practical: 20 });
    assert.equal(result.received, 80);
    assert.equal(result.letter, "A+");
  }
});
