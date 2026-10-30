/**
 * Server-side ImgBB upload. The API key is never returned to the browser.
 * ImgBB v1 accepts base64 image data in a multipart POST body.
 */
function uploadError(message, status = 502) {
  return Object.assign(new Error(message), { status });
}

export function isImgBBImageUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname === "i.ibb.co" &&
      parsed.pathname.length > 1 && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

export async function uploadImageToImgBB({ bytes, apiKey, name, fetchImpl = fetch }) {
  const key = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!key) throw uploadError("Vercel-এ IMGBB_API_KEY সেট করা নেই", 503);

  const formData = new FormData();
  formData.set("image", Buffer.from(bytes).toString("base64"));
  if (name) formData.set("name", name);

  let response;
  try {
    response = await fetchImpl("https://api.imgbb.com/1/upload?key=" + encodeURIComponent(key), {
      method: "POST",
      body: formData,
      cache: "no-store",
      signal: AbortSignal.timeout(20000)
    });
  } catch {
    throw uploadError("ImgBB সার্ভারের সঙ্গে সংযোগ করা যায়নি। আবার চেষ্টা করুন");
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw uploadError("ImgBB থেকে সঠিক উত্তর পাওয়া যায়নি");
  }
  if (!response.ok || payload?.success !== true)
    throw uploadError("ImgBB ছবি গ্রহণ করেনি। API key এবং আপলোডের সীমা যাচাই করুন");

  const photoUrl = payload?.data?.url;
  if (!isImgBBImageUrl(photoUrl))
    throw uploadError("ImgBB থেকে সঠিক HTTPS ছবির লিংক পাওয়া যায়নি");

  return { photoUrl, imageId: String(payload.data.id || "").slice(0, 100) };
}
