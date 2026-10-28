import { randomBytes } from "node:crypto";
import { adminAuth, db } from "../../../../lib/firebase-admin";
import { normalizePhone, normalizePin } from "../../../../lib/phone-pin";
import { registerPhoneCredential } from "../../../../lib/phone-accounts";
import { actorFrom, fail, json, verifyOrigin } from "../../../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req) {
  try {
    verifyOrigin(req);
    const actor = await actorFrom(req);
    if (Number(req.headers.get("content-length") || 0) > 2500) return fail("অনুরোধটি অনেক বড়", 413);
    const body = await req.json();
    const phone = normalizePhone(body?.phone), pin = normalizePin(body?.pin);
    if (!phone || !pin) return fail("মোবাইল নম্বর ও পাঁচ সংখ্যার PIN সঠিকভাবে দিন");
    const store = db();
    if ((await store.collection("loginCredentials").doc(actor.uid).get()).exists)
      return fail("এই অ্যাকাউন্টে PIN আগে থেকেই সেট করা আছে", 409);
    await registerPhoneCredential({ uid: actor.uid, phone, pin });
    // Invalidate the legacy password after one-time migration; login is PIN-only afterward.
    try {
      await adminAuth().updateUser(actor.uid, { password: randomBytes(48).toString("hex") });
    } catch (error) {
      console.error("Legacy password invalidation:", String(error?.code||"unknown").slice(0,48));
      return fail("PIN তৈরি হয়েছে। আগের পাসওয়ার্ড বন্ধ করতে কর্তৃপক্ষের সহায়তা লাগবে", 503);
    }
    const customToken = await adminAuth().createCustomToken(actor.uid);
    return json({ customToken });
  } catch(e) {
    return fail(e?.status ? e.message : "অ্যাকাউন্ট আপগ্রেড সম্পন্ন করা যায়নি", e?.status || 503);
  }
}
