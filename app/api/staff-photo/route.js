import { randomUUID } from "node:crypto";
import { actorFrom, fail, handleError, json, verifyOrigin } from "../../../lib/server-auth";
import { db } from "../../../lib/firebase-admin";
import { uploadImageToImgBB } from "../../../lib/imgbb.js";
import { imageType } from "../../../lib/image-type.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Principal-only upload of a teacher's portrait. The image goes to ImgBB (the API key never
 * reaches the browser) and the HTTPS link is returned; the teacher form then saves it as
 * users/{uid}.photoUrl through the normal account.create / account.update actions.
 */
export async function POST(req) {
  try {
    verifyOrigin(req);
    const actor = await actorFrom(req);
    if (actor.role !== "principal") return fail("শুধুমাত্র প্রতিষ্ঠান প্রধান শিক্ষকের ছবি আপলোড করতে পারবেন", 403);
    if (!process.env.IMGBB_API_KEY?.trim()) return fail("Vercel-এ IMGBB_API_KEY সেট করা নেই", 503);
    if (Number(req.headers.get("content-length") || 0) > 3400000) return fail("ছবি ৩ MB-এর মধ্যে হতে হবে", 413);

    const form = await req.formData();
    const uploaded = form.get("file");
    if (!uploaded || typeof uploaded.arrayBuffer !== "function" || uploaded.size < 64 || uploaded.size > 3145728)
      return fail("JPG, PNG বা WebP ছবি দিন (সর্বোচ্চ ৩ MB)");
    const bytes = Buffer.from(await uploaded.arrayBuffer());
    const kind = imageType(bytes);
    if (!kind) return fail("ছবির ফরম্যাট সঠিক নয়");

    const { photoUrl, imageId } = await uploadImageToImgBB({
      bytes,
      apiKey: process.env.IMGBB_API_KEY,
      name: "hmrs-teacher-" + randomUUID() + "." + kind[0]
    });
    await db().collection("audit").add({
      actorUid: actor.uid, action: "staff.photo.upload", target: "imgbb:" + imageId, at: new Date().toISOString()
    });
    return json({ ok: true, photoUrl });
  } catch (e) { return handleError(e); }
}
