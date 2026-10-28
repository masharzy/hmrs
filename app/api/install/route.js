import { randomUUID } from "node:crypto";
import { z } from "zod";
import { adminAuth, db } from "../../../lib/firebase-admin";
import { normalizePhone, normalizePin, makePinCredential } from "../../../lib/phone-pin";
import { installPrerequisites, classifyFirebaseFailure, checkFirebaseProjectIds, classifyInstallActionFailure } from "../../../lib/install-utils";
import { fail, json, verifyOrigin } from "../../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(3, "কমপক্ষে ৩ অক্ষরের নাম লিখুন").max(120),
  phone: z.string().trim().min(11).max(20),
  pin: z.string().min(5).max(5)
}).strict();
const installation = () => db().collection("settings").doc("installation");
const installationError = (message, status) => Object.assign(new Error(message), { status });

export async function GET() {
  const missing = installPrerequisites(process.env);
  if (missing.length) return json({ installed: false, ready: false, missing });
  const mismatch = checkFirebaseProjectIds(process.env);
  if (mismatch) return json({ installed: false, ready: false, error: mismatch.hint, code: mismatch.code });
  try {
    const snapshot = await installation().get();
    const installed = snapshot.exists && snapshot.data()?.status === "installed";
    if (!installed) {
      try {
        // Read-only Firebase Auth connectivity check. No accounts are created.
        await adminAuth().listUsers(1);
      } catch (e) {
        const issue = classifyInstallActionFailure(e, "check-auth");
        console.error("Install Firebase Auth readiness:", issue.code, String(e?.code ?? "").slice(0, 48));
        return json({ installed: false, ready: false, error: issue.hint, code: issue.code });
      }
    }
    return json({ installed, ready: true });
  } catch (e) {
    const issue = classifyFirebaseFailure(e);
    console.error("Install Firestore readiness error:", issue.code, String(e?.code ?? "").slice(0, 36));
    return json({ installed: false, ready: false, error: issue.hint, code: issue.code });
  }
}

export async function POST(req) {
  let reserved = false, uid = null, completed = false;
  let nonce = "", stage = "validate";
  try {
    verifyOrigin(req);
    if (Number(req.headers.get("content-length") || 0) > 4096)
      return fail("অনুরোধটি অনেক বড়", 413);
    if (installPrerequisites(process.env).length)
      return fail("প্রথমে Firebase environment variables সেট করুন", 503);
    const mismatch = checkFirebaseProjectIds(process.env);
    if (mismatch) return fail(mismatch.hint, 503);

    const body = schema.safeParse(await req.json());
    if (!body.success) return fail(body.error.issues[0].message, 400);
    const { name } = body.data;
    const phone = normalizePhone(body.data.phone), pin = normalizePin(body.data.pin);
    if (!phone || !pin) return fail("সঠিক মোবাইল নম্বর এবং ৫ সংখ্যার PIN দিন");

    const store = db();
    const ref = installation();
    nonce = randomUUID();
    const now = Date.now();
    stage = "reserve-install";
    await store.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const previous = snap.data();
      if (previous?.status === "installed")
        throw installationError("প্রতিষ্ঠানের সেটআপ ইতিমধ্যে সম্পন্ন হয়েছে", 409);
      if (previous?.status === "installing" && Number(previous.leaseUntil) > now)
        throw installationError("সেটআপের একটি অনুরোধ চলছে; কয়েক মিনিট পর পুনরায় চেষ্টা করুন", 409);
      tx.set(ref, { status: "installing", nonce, leaseUntil: now + 180000 });
    });
    reserved = true;

    stage = "create-firebase-user";
    const user = await adminAuth().createUser({ displayName: name });
    uid = user.uid;

    stage = "save-principal";
    const phoneRef = store.collection("loginPhones").doc(phone);
    const pinCredential = makePinCredential(pin);
    await store.runTransaction(async tx => {
      const [state, existingPhone] = await Promise.all([tx.get(ref), tx.get(phoneRef)]);
      if (state.data()?.status !== "installing" || state.data()?.nonce !== nonce)
        throw installationError("সেটআপের সময়সীমা শেষ হয়েছে, আবার চেষ্টা করুন", 409);
      if (existingPhone.exists) throw installationError("এই মোবাইল নম্বর অন্য অ্যাকাউন্টে ব্যবহৃত হচ্ছে", 409);
      const profile = store.collection("users").doc(uid);
      tx.create(phoneRef, { uid, createdAt: new Date().toISOString() });
      tx.create(store.collection("loginCredentials").doc(uid), { ...pinCredential, phone, createdAt: new Date().toISOString() });
      tx.set(profile, {
        name, phone, pinEnabled: true, role: "principal",
        active: true, assignedClasses: [], createdAt: new Date().toISOString()
      });
      tx.set(ref, {
        status: "installed", principalUid: uid,
        installedAt: new Date().toISOString()
      });
      tx.set(store.collection("audit").doc(), {
        actorUid: uid, action: "principal.install", target: "school",
        at: new Date().toISOString()
      });
    });
    completed = true;
    const customToken = await adminAuth().createCustomToken(uid);
    return json({ ok: true, customToken, message: "প্রধান শিক্ষকের অ্যাকাউন্ট তৈরি হয়েছে" }, 201);
  } catch (e) {
    // If the commit succeeded but the server lost the response, never delete that principal.
    if (uid && !completed) {
      try {
        const state = await installation().get();
        if (state.data()?.status === "installed" && state.data()?.principalUid === uid)
          return json({ ok: true, message: "সেটআপ সম্পন্ন" });
      } catch { /* Cannot verify; do not delete potentially installed account. */ return fail("সেটআপের অবস্থা যাচাই করা যায়নি", 503); }
      try { await adminAuth().deleteUser(uid); } catch { /* orphan requires admin cleanup */ }
    }
    if (e.status) return fail(e.message, e.status);
    const issue = classifyInstallActionFailure(e, stage);
    console.error("Install principal creation failed:", stage, issue.code, String(e?.code ?? "").slice(0, 48));
    return Response.json({ error: issue.hint, code: issue.code, stage }, { status: 503, headers: { "Cache-Control": "no-store" } });
  } finally {
    if (reserved && !completed && nonce) {
      try {
        await db().runTransaction(async tx => {
          const ref = installation(), snap = await tx.get(ref);
          if (snap.data()?.status === "installing" && snap.data()?.nonce === nonce)
            tx.delete(ref);
        });
      } catch { /* lease expires automatically; no second principal can win */ }
    }
  }
}