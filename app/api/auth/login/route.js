import { adminAuth, db } from "../../../../lib/firebase-admin";
import { normalizePhone, normalizePin, verifyPin } from "../../../../lib/phone-pin";
import { fail, json, verifyOrigin } from "../../../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const incorrect = () => fail("মোবাইল নম্বর, PIN বা পোর্টাল সঠিক নয়", 401);
const roles = new Set(["student","teacher","class_teacher","principal"]);

export async function POST(req) {
  try {
    verifyOrigin(req);
    if (Number(req.headers.get("content-length") || 0) > 2000) return fail("অনুরোধটি অনেক বড়", 413);
    const body = await req.json();
    const phone = normalizePhone(body?.phone), pin = normalizePin(body?.pin), role = body?.role;
    if (!phone || !pin || !roles.has(role)) return incorrect();

    const store = db();
    const attempts = store.collection("pinAttempts").doc(phone);
    const now = Date.now();
    // Atomic reservation BEFORE checking a PIN ensures five tries per phone per 15-minute window.
    const permitted = await store.runTransaction(async tx => {
      const existing = (await tx.get(attempts)).data() || {};
      const windowValid = Number(existing.windowUntil) > now;
      const count = windowValid ? Number(existing.count) || 0 : 0;
      if (count >= 5) return false;
      tx.set(attempts, { count: count + 1, windowUntil: windowValid ? existing.windowUntil : now + 15 * 60 * 1000 });
      return true;
    });
    if (!permitted) return fail("বেশি চেষ্টা হয়েছে। ১৫ মিনিট পর আবার চেষ্টা করুন", 429);

    const phoneSnap = await store.collection("loginPhones").doc(phone).get();
    if (!phoneSnap.exists) return incorrect();
    const uid = phoneSnap.data()?.uid;
    if (typeof uid !== "string" || !uid) return incorrect();
    const [credential, user] = await Promise.all([
      store.collection("loginCredentials").doc(uid).get(),
      store.collection("users").doc(uid).get()
    ]);
    if (!credential.exists || !user.exists || user.data().active !== true ||
        user.data().role !== role || credential.data().phone !== phone ||
        !verifyPin(pin, credential.data())) return incorrect();
    // This token is exchanged by the browser for a normal Firebase session.
    const customToken = await adminAuth().createCustomToken(uid);
    await attempts.delete();
    return json({ customToken });
  } catch(e) {
    console.error("Phone PIN authentication:", String(e?.code || "request-failed").slice(0,48));
    return fail(e?.status ? e.message : "লগইন সম্পন্ন করা যায়নি", e?.status || 503);
  }
}
