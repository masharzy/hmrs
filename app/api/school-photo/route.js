import { randomUUID } from "node:crypto";
import { actorFrom, fail, handleError, json, verifyOrigin } from "../../../lib/server-auth";
import { db } from "../../../lib/firebase-admin";
import { uploadImageToImgBB } from "../../../lib/imgbb.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function imageType(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ["jpg", "image/jpeg"];
  if (buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return ["png", "image/png"];
  if (buf.subarray(0,4).toString() === "RIFF" && buf.subarray(8,12).toString() === "WEBP") return ["webp", "image/webp"];
  return null;
}

export async function POST(req) {
  try {
    verifyOrigin(req);
    const actor = await actorFrom(req);
    if (actor.role !== "principal") return fail("শুধুমাত্র প্রতিষ্ঠান প্রধান ছবি পরিবর্তন করতে পারবেন", 403);
    if (!process.env.IMGBB_API_KEY?.trim()) return fail("Vercel-এ IMGBB_API_KEY সেট করা নেই", 503);
    if (Number(req.headers.get("content-length") || 0) > 3400000) return fail("ছবি ৩ MB-এর মধ্যে হতে হবে", 413);

    const form = await req.formData();
    const uploaded = form.get("file");
    if (!uploaded || typeof uploaded.arrayBuffer !== "function" || uploaded.size < 64 || uploaded.size > 3145728)
      return fail("JPG, PNG বা WebP ছবি দিন (সর্বোচ্চ ৩ MB)");
    const bytes = Buffer.from(await uploaded.arrayBuffer());
    const kind = imageType(bytes);
    if (!kind) return fail("ছবির ফরম্যাট সঠিক নয়");

    const { photoUrl, imageId } = await uploadImageToImgBB({
      bytes,
      apiKey: process.env.IMGBB_API_KEY,
      name: "hmrs-school-" + randomUUID() + "." + kind[0]
    });

    const now = new Date().toISOString();
    const firestore = db();
    await firestore.collection("settings").doc("school").set({
      photoUrl, photoUpdatedAt: now
    }, { merge: true });
    await firestore.collection("audit").add({
      actorUid: actor.uid, action: "school.photo.upload", target: "imgbb:" + imageId, at: now
    });
    return json({ ok: true, photoUrl });
  } catch (e) { return handleError(e); }
}
