import { randomUUID } from "node:crypto";
import { z } from "zod";
import { adminAuth, db } from "../../../lib/firebase-admin";
import { installPrerequisites } from "../../../lib/install-utils";
import { fail, json, verifyOrigin } from "../../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(3, "কমপক্ষে ৩ অক্ষরের নাম লিখুন").max(120),
  email: z.string().trim().email("সঠিক ইমেইল ঠিকানা লিখুন").max(160),
  password: z.string().min(12, "পাসওয়ার্ড অন্তত ১২ অক্ষরের হতে হবে").max(128)
}).strict();
const installation = () => db().collection("settings").doc("installation");
const installationError = (message, status) => Object.assign(new Error(message), { status });

export async function GET() {
  const missing = installPrerequisites(process.env);
  if (missing.length) return json({ installed: false, ready: false, missing });
  try {
    const snapshot = await installation().get();
    const installed = snapshot.exists && snapshot.data()?.status === "installed";
    return json({ installed, ready: true });
  } catch {
    return json({ installed: false, ready: false, error: "Firebase Firestore সংযোগ বা অনুমতি যাচাই করুন" });
  }
}

export async function POST(req) {
  let reserved = false, uid = null, completed = false;
  let nonce = "";
  try {
    verifyOrigin(req);
    if (Number(req.headers.get("content-length") || 0) > 4096)
      return fail("অনুরোধটি অনেক বড়", 413);
    if (installPrerequisites(process.env).length)
      return fail("প্রথমে Firebase environment variables সেট করুন", 503);

    const body = schema.safeParse(await req.json());
    if (!body.success) return fail(body.error.issues[0].message, 400);
    const { name, email, password } = body.data;

    const store = db();
    const ref = installation();
    nonce = randomUUID();
    const now = Date.now();
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

    const user = await adminAuth().createUser({
      email: email.toLowerCase(), password, displayName: name, emailVerified: false
    });
    uid = user.uid;

    await store.runTransaction(async tx => {
      const state = await tx.get(ref);
      if (state.data()?.status !== "installing" || state.data()?.nonce !== nonce)
        throw installationError("সেটআপের সময়সীমা শেষ হয়েছে, আবার চেষ্টা করুন", 409);
      const profile = store.collection("users").doc(uid);
      tx.set(profile, {
        name, email: email.toLowerCase(), role: "principal",
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
    return json({ ok: true, message: "প্রধান শিক্ষকের অ্যাকাউন্ট তৈরি হয়েছে" }, 201);
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
    return fail(e.status ? e.message : "সেটআপ সম্পন্ন করা যায়নি। Firebase কনফিগারেশন যাচাই করুন।", e.status || 400);
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