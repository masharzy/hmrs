import { randomUUID } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import { actorFrom, fail, handleError, json, verifyOrigin } from "../../../lib/server-auth";
import { db } from "../../../lib/firebase-admin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function imageType(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ["jpg","image/jpeg"];
  if (buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return ["png","image/png"];
  if (buf.subarray(0,4).toString() === "RIFF" && buf.subarray(8,12).toString() === "WEBP") return ["webp","image/webp"];
  return null;
}
export async function POST(req) {
  try {
    verifyOrigin(req);
    const actor = await actorFrom(req);
    if (actor.role !== "principal") return fail("শুধুমাত্র প্রতিষ্ঠান প্রধান ছবি পরিবর্তন করতে পারবেন",403);
    if (Number(req.headers.get("content-length") || 0) > 3400000) return fail("ছবি ৩ MB-এর মধ্যে হতে হবে",413);
    const form = await req.formData(), uploaded = form.get("file");
    if (!uploaded || typeof uploaded.arrayBuffer !== "function" || uploaded.size < 64 || uploaded.size > 3145728)
      return fail("JPG, PNG বা WebP ছবি দিন (সর্বোচ্চ ৩ MB)");
    const bytes = Buffer.from(await uploaded.arrayBuffer());
    const kind = imageType(bytes);
    if (!kind) return fail("ছবির ফরম্যাট সঠিক নয়");
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) return fail("Firebase Storage bucket configured নয়",503);
    // Initializing Firestore also initializes the Firebase Admin app.
    const firestore = db();
    const bucket = getStorage().bucket(bucketName);
    const path = "school/hero/" + Date.now() + "-" + randomUUID() + "." + kind[0];
    const downloadToken = randomUUID();
    await bucket.file(path).save(bytes, {
      resumable: false, contentType: kind[1],
      metadata: { cacheControl: "public, max-age=3600", metadata: { firebaseStorageDownloadTokens: downloadToken } }
    });
    const url = "https://firebasestorage.googleapis.com/v0/b/" + encodeURIComponent(bucketName) + "/o/" +
      encodeURIComponent(path) + "?alt=media&token=" + downloadToken;
    await firestore.collection("settings").doc("school").set({photoUrl:url,photoUpdatedAt:new Date().toISOString()}, {merge:true});
    await firestore.collection("audit").add({actorUid:actor.uid,action:"school.photo.upload",target:path,at:new Date().toISOString()});
    return json({ok:true,photoUrl:url});
  } catch (e) { return handleError(e); }
}