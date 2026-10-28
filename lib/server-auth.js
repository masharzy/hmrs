import "server-only";
import { adminAuth, db } from "./firebase-admin";

export function fail(message, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
export function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
export function cleanText(value, max = 250) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
export function validGrade(v) { return Number.isInteger(Number(v)) && Number(v) >= 6 && Number(v) <= 10; }
export function classKey(grade, section) { return String(grade) + "-" + String(section).trim().toLowerCase().replace(/[^a-z0-9]/g, ""); }
export function studentKey(grade, section, roll) { return classKey(grade, section) + "-" + Number(roll); }
export function canAccessClass(actor, grade, section) {
  return actor.role === "principal" || actor.role === "teacher" ||
    (actor.role === "class_teacher" && (actor.assignedClasses || []).includes(classKey(grade, section)));
}
export function needRole(actor, roles) {
  if (!roles.includes(actor.role)) throw Object.assign(Error("আপনার এই কাজের অনুমতি নেই"), { status: 403 });
}
export async function actorFrom(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer /i, "");
  if (!token) throw Object.assign(Error("প্রথমে লগইন করুন"), { status: 401 });
  let decoded;
  try { decoded = await adminAuth().verifyIdToken(token, true); }
  catch { throw Object.assign(Error("সেশন শেষ হয়েছে; পুনরায় লগইন করুন"), { status: 401 }); }
  if (process.env.HEAD_TEACHER_UID && decoded.uid === process.env.HEAD_TEACHER_UID)
    return { uid: decoded.uid, role: "principal", name: "প্রতিষ্ঠান প্রধান", assignedClasses: [] };
  const snap = await db().collection("users").doc(decoded.uid).get();
  if (!snap.exists || !snap.data()?.active) throw Object.assign(Error("অ্যাকাউন্ট অনুমোদিত নয়"), { status: 403 });
  return { uid: decoded.uid, ...snap.data() };
}
export function handleError(e) { console.error("HMRS API:", e.message); return fail(e.status ? e.message : "অনুরোধটি সম্পন্ন করা যায়নি", e.status || 400); }

export function verifyOrigin(req) {
  const required = process.env.APP_ORIGIN;
  const origin = req.headers.get("origin");
  if (required && origin && new URL(origin).origin !== new URL(required).origin)
    throw Object.assign(Error("অবৈধ অনুরোধের উৎস"), { status: 403 });
}
