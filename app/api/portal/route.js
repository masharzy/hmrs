import { adminAuth, db } from "../../../lib/firebase-admin";
import { actorFrom, canAccessClass, classKey, cleanText, fail, handleError, json, needRole, studentKey, validGrade, verifyOrigin } from "../../../lib/server-auth";
import { evaluateTranscript, validateMarkForStudent } from "../../../lib/academic";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const iso = () => new Date().toISOString();
const allowedStaff = ["teacher", "class_teacher", "principal"];
const asDocs = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));
const visible = (actor, item) => canAccessClass(actor, item.grade, item.section);
const audit = (actor, action, target) => db().collection("audit").add({ actorUid: actor.uid, action, target: String(target || ""), at: iso() });

async function studentFor(actor, id) {
  const snap = await db().collection("students").doc(id).get();
  if (!snap.exists) throw Error("শিক্ষার্থী পাওয়া যায়নি");
  const student = { id: snap.id, ...snap.data() };
  if (actor.role === "student" ? actor.studentId !== id : !visible(actor, student))
    throw Object.assign(Error("এই শিক্ষার্থী দেখার অনুমতি নেই"), { status: 403 });
  return student;
}

export async function GET(req) {
  try {
    const actor = await actorFrom(req);
    const u = new URL(req.url);
    const resource = u.searchParams.get("resource") || "profile";
    const store = db();
    if (resource === "profile") {
      if (actor.role !== "student") return json({ actor });
      const student = await studentFor(actor, actor.studentId);
      const attendance = await store.collection("attendance").where("studentId", "==", student.id).limit(250).get();
      const dues = student.due || 0;
      const examsSnap = await store.collection("exams").where("published", "==", true).limit(30).get();
      const published = asDocs(examsSnap);
      const results = [];
      const allMarks = await store.collection("marks").where("studentId", "==", student.id).limit(1000).get();
      for (const exam of published) {
        const markMap = Object.fromEntries(allMarks.docs.filter(m => m.data().examId === exam.id).map(m => [m.data().subjectId, m.data().scores]));
        results.push({ exam, result: evaluateTranscript(student, markMap) });
      }
      return json({ actor, student, dues, attendance: asDocs(attendance), results });
    }
    needRole(actor, allowedStaff);
    if (resource === "students") {
      const snap = await store.collection("students").limit(900).get();
      return json({ items: asDocs(snap).filter(s => visible(actor, s)) });
    }
    if (resource === "admissions") {
      needRole(actor, ["class_teacher", "principal"]);
      const snap = await store.collection("admissions").orderBy("createdAt", "desc").limit(250).get();
      return json({ items: asDocs(snap).filter(a => visible(actor, a)) });
    }
    if (resource === "notices") {
      const snap = await store.collection("notices").orderBy("createdAt", "desc").limit(100).get();
      return json({ items: asDocs(snap) });
    }
    if (resource === "users") {
      needRole(actor, ["principal"]);
      const snap = await store.collection("users").limit(200).get();
      return json({ items: asDocs(snap) });
    }
    if (resource === "attendance") {
      const date = u.searchParams.get("date");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return fail("সঠিক তারিখ দিন");
      const snap = await store.collection("attendance").where("date", "==", date).limit(900).get();
      return json({ items: asDocs(snap).filter(a => visible(actor, a)) });
    }
    if (resource === "exams") {
      const snap = await store.collection("exams").orderBy("createdAt", "desc").limit(60).get();
      return json({ items: asDocs(snap) });
    }
    if (resource === "marks") {
      const examId = u.searchParams.get("examId");
      if (!examId || examId.length > 150) return fail("পরীক্ষা নির্বাচন করুন");
      const snap = await store.collection("marks").where("examId", "==", examId).limit(3000).get();
      return json({ items: asDocs(snap).filter(m => visible(actor, m)) });
    }
    if (resource === "ledger") {
      needRole(actor, ["principal", "class_teacher"]);
      const snap = await store.collection("ledger").orderBy("createdAt", "desc").limit(600).get();
      return json({ items: asDocs(snap).filter(l => actor.role === "principal" || visible(actor, l)) });
    }
    if (resource === "settings") {
      const snap = await store.collection("settings").doc("school").get();
      return json({ settings: snap.exists ? snap.data() : {} });
    }
    return fail("অজানা রিসোর্স");
  } catch (e) { return handleError(e); }
}

export async function POST(req) {
  let createdUid = null;
  try {
    verifyOrigin(req);
    const actor = await actorFrom(req);
    if (Number(req.headers.get("content-length") || 0) > 20000) return fail("অনুরোধটি অনেক বড়", 413);
    const body = await req.json();
    const action = cleanText(body.action, 60);
    const store = db();
    if (action === "notice.save") {
      needRole(actor, ["principal"]);
      const title = cleanText(body.title, 170), message = cleanText(body.message, 3000);
      if (!title || !message) return fail("শিরোনাম ও বিবরণ দিন");
      const ref = body.id ? store.collection("notices").doc(String(body.id)) : store.collection("notices").doc();
      await ref.set({ title, message, published: !!body.published, createdAt: iso(), updatedBy: actor.uid }, { merge: true });
      await audit(actor, action, ref.id); return json({ ok: true });
    }
    if (action === "notice.delete") {
      needRole(actor, ["principal"]);
      if (!body.id) return fail("নোটিশ নির্বাচন করুন");
      await store.collection("notices").doc(String(body.id)).delete();
      await audit(actor, action, body.id); return json({ ok: true });
    }
    if (action === "settings.update") {
      needRole(actor, ["principal"]);
      const photoUrl = cleanText(body.photoUrl, 1000), subtitle = cleanText(body.subtitle, 350);
      if (photoUrl && (!/^https:\/\//i.test(photoUrl) || !/^https:\/\/[^\s]+$/i.test(photoUrl))) return fail("শুধুমাত্র HTTPS ছবি URL গ্রহণযোগ্য");
      await store.collection("settings").doc("school").set({ photoUrl, subtitle, updatedAt: iso() }, { merge: true });
      await audit(actor, action, "school"); return json({ ok: true });
    }
    if (action === "account.create") {
      needRole(actor, ["principal"]);
      const role = body.role, username = cleanText(body.username, 40).toLowerCase(),
        password = String(body.password || ""), name = cleanText(body.name, 120);
      if (!["teacher", "class_teacher"].includes(role) || !/^[a-z0-9._-]{3,40}$/.test(username)
          || password.length < 8 || password.length > 100 || !name) return fail("ইউজারের তথ্য সঠিক নয়");
      const assignedClasses = Array.isArray(body.assignedClasses)
        ? body.assignedClasses.map(v => cleanText(v, 20)).filter(v => /^(6|7|8|9|10)-[a-z0-9]+$/.test(v)).slice(0, 15) : [];
      if (role === "class_teacher" && !assignedClasses.length) return fail("শ্রেণি শিক্ষককে অন্তত একটি শ্রেণি/শাখা দিন");
      const user = await adminAuth().createUser({ email: username + "@staff.hmrs.school", password, displayName: name });
      createdUid = user.uid;
      await store.collection("users").doc(user.uid).set({ name, username, role, assignedClasses, active: true, createdAt: iso() });
      createdUid = null;
      await audit(actor, action, username); return json({ ok: true });
    }
    if (action === "application.approve") {
      needRole(actor, ["principal", "class_teacher"]);
      const id = cleanText(body.id, 150), roll = String(body.roll || ""), password = String(body.password || "");
      const ref = store.collection("admissions").doc(id);
      const snap = await ref.get();
      if (!snap.exists) return fail("আবেদন পাওয়া যায়নি");
      const application = snap.data();
      if (!visible(actor, application)) return fail("এই শ্রেণির অনুমতি নেই", 403);
      if (application.status !== "pending") return fail("আবেদন ইতিমধ্যে নিষ্পত্তি হয়েছে");
      if (!/^[1-9][0-9]{0,3}$/.test(roll) || password.length < 8 || password.length > 100) return fail("রোল ১–৯৯৯৯ এবং পাসওয়ার্ড অন্তত ৮ অক্ষর হতে হবে");
      const idStudent = studentKey(application.grade, application.section, roll);
      if ((await store.collection("students").doc(idStudent).get()).exists) return fail("এই রোল ইতিমধ্যে ভর্তি আছে");
      const email = "s" + application.grade + "-" + String(application.section).toLowerCase() + "-" + Number(roll) + "@students.hmrs.school";
      const user = await adminAuth().createUser({ email, password, displayName: application.studentName });
      createdUid = user.uid;
      const student = {
        uid: user.uid, applicationId: id, name: application.studentName, grade: Number(application.grade),
        section: application.section, roll: Number(roll), group: application.group || "science",
        elective: application.group === "science" ? "higher-math" : application.group === "humanities" ? "civics" : "agriculture",
        fourthSubject: "agriculture", optionalId: application.group === "science" ? "biology" : "agriculture", dob: application.dob, gender: application.gender,
        fatherName: application.fatherName, fatherPhone: application.fatherPhone,
        motherName: application.motherName, motherPhone: application.motherPhone,
        guardianAddress: application.guardianAddress, birthRegistration: application.birthRegistration,
        previousSchool: application.previousSchool, due: 0, createdAt: iso()
      };
      await store.runTransaction(async t => {
        const currentApp = await t.get(ref);
        const existing = await t.get(store.collection("students").doc(idStudent));
        if (existing.exists || currentApp.data()?.status !== "pending") throw Error("আবেদন/রোল ইতিমধ্যে ব্যবহৃত হয়েছে");
        t.set(store.collection("students").doc(idStudent), student);
        t.set(store.collection("users").doc(user.uid), { role: "student", name: student.name, active: true,
          studentId: idStudent, createdAt: iso() });
        t.update(ref, { status: "approved", studentId: idStudent, approvedBy: actor.uid, approvedAt: iso() });
      });
      createdUid = null;
      await audit(actor, action, idStudent); return json({ ok: true, studentId: idStudent });
    }
    if (action === "application.reject") {
      needRole(actor, ["class_teacher", "principal"]);
      const ref = store.collection("admissions").doc(cleanText(body.id, 150));
      const snap = await ref.get();
      if (!snap.exists || !visible(actor, snap.data())) return fail("আবেদন পাওয়া যায়নি");
      if (snap.data().status !== "pending") return fail("ইতিমধ্যে নিষ্পত্তি হয়েছে");
      await ref.update({ status: "rejected", reviewedBy: actor.uid, reviewedAt: iso() });
      await audit(actor, action, ref.id); return json({ ok: true });
    }
    if (action === "attendance.set") {
      needRole(actor, allowedStaff);
      const student = await studentFor(actor, cleanText(body.studentId, 100));
      const date = cleanText(body.date, 15), status = body.status;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !["present", "absent", "left_early"].includes(status)) return fail("তারিখ বা উপস্থিতি সঠিক নয়");
      const key = date + "_" + student.id;
      await store.collection("attendance").doc(key).set({
        studentId: student.id, studentName: student.name, grade: student.grade,
        section: student.section, date, status, note: cleanText(body.note, 250),
        updatedBy: actor.uid, updatedAt: iso()
      });
      await audit(actor, action, key); return json({ ok: true });
    }
    if (action === "exam.create") {
      needRole(actor, ["principal", "class_teacher"]);
      const name = cleanText(body.name, 130);
      if (!name) return fail("পরীক্ষার নাম লিখুন");
      const ref = await store.collection("exams").add({ name, year: new Date().getFullYear(),
        published: false, createdAt: iso(), createdBy: actor.uid });
      await audit(actor, action, ref.id); return json({ ok: true, examId: ref.id });
    }
    if (action === "exam.publish") {
      needRole(actor, ["principal"]);
      const ref = store.collection("exams").doc(cleanText(body.examId, 150));
      if (!(await ref.get()).exists) return fail("পরীক্ষা পাওয়া যায়নি");
      await ref.update({ published: !!body.published, updatedAt: iso() });
      await audit(actor, action, ref.id); return json({ ok: true });
    }
    if (action === "marks.set") {
      needRole(actor, allowedStaff);
      const student = await studentFor(actor, cleanText(body.studentId, 120));
      const examId = cleanText(body.examId, 150), subjectId = cleanText(body.subjectId, 80);
      const exam = await store.collection("exams").doc(examId).get();
      if (!exam.exists) return fail("পরীক্ষা পাওয়া যায়নি");
      if (exam.data().published && actor.role !== "principal") return fail("প্রকাশিত ফল প্রধান শিক্ষক ছাড়া পরিবর্তন করতে পারবেন না");
      const scores = body.scores;
      validateMarkForStudent(student, subjectId, scores);
      const key = examId + "_" + student.id + "_" + subjectId;
      await store.collection("marks").doc(key).set({
        examId, studentId: student.id, subjectId, scores, grade: student.grade,
        section: student.section, updatedBy: actor.uid, updatedAt: iso()
      });
      await audit(actor, action, key); return json({ ok: true });
    }
    if (action === "ledger.add") {
      needRole(actor, ["principal", "class_teacher"]);
      const type = body.type, amount = Number(body.amount), grade = Number(body.grade),
        section = cleanText(body.section, 10), description = cleanText(body.description, 250);
      if (!["income", "expense"].includes(type) || !Number.isFinite(amount) || amount <= 0 || amount > 10000000 ||
          !validGrade(grade) || !/^[a-z0-9]{1,10}$/i.test(section) || !description) return fail("হিসাবের তথ্য যাচাই করুন");
      if (!visible(actor, { grade, section })) return fail("নিজের শ্রেণির হিসাবেই পরিবর্তন করতে পারবেন", 403);
      const ref = await store.collection("ledger").add({
        type, amount, grade, section, description, createdBy: actor.uid, createdAt: iso()
      });
      await audit(actor, action, ref.id); return json({ ok: true });
    }
    if (action === "student.dues") {
      needRole(actor, ["principal", "class_teacher"]);
      const student = await studentFor(actor, cleanText(body.studentId, 120));
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < 0 || amount > 10000000) return fail("সঠিক পাওনা দিন");
      await store.collection("students").doc(student.id).update({ due: amount, dueUpdatedAt: iso() });
      await audit(actor, action, student.id); return json({ ok: true });
    }
    if (action === "student.subjects") {
      needRole(actor, ["principal", "class_teacher"]);
      const student = await studentFor(actor, cleanText(body.studentId, 120));
      if (student.grade < 9) return fail("শুধু ৯ম ও ১০ম শ্রেণির জন্য");
      const group = body.group, elective = body.elective, fourthSubject = body.fourthSubject,
        optionalId = body.optionalId;
      const { getSubjects } = await import("../../../lib/academic");
      const subjects = getSubjects(student.grade, group, elective, fourthSubject);
      if (!subjects.some(s => s.id === optionalId)) return fail("চতুর্থ বিষয় সঠিক নয়");
      if (group === "science" && !["biology", elective].includes(optionalId)) return fail("বিজ্ঞান বিভাগের চতুর্থ বিষয়টি সঠিক নয়");
      if (group !== "science" && optionalId !== (group === "business" ? elective : fourthSubject)) return fail("চতুর্থ বিষয়টি নির্বাচন করুন");
      await store.collection("students").doc(student.id).update({ group, elective, fourthSubject, optionalId });
      await audit(actor, action, student.id); return json({ ok: true });
    }
    if (action === "payment.verify") {
      needRole(actor, ["principal"]);
      const ref = store.collection("admissions").doc(cleanText(body.id, 150));
      if (!(await ref.get()).exists) return fail("আবেদন পাওয়া যায়নি");
      await ref.update({ paymentStatus: "verified_manually", paymentVerifiedBy: actor.uid, paymentVerifiedAt: iso() });
      await audit(actor, action, ref.id); return json({ ok: true });
    }
    return fail("অজানা অ্যাকশন");
  } catch (e) {
    if (createdUid) { try { await adminAuth().deleteUser(createdUid); } catch {} }
    return handleError(e);
  }
}