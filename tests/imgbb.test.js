import { test } from "node:test";
import assert from "node:assert/strict";
import { isImgBBImageUrl, uploadImageToImgBB } from "../lib/imgbb.js";

const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00]);
const imgbbUrl = "https://i.ibb.co/abc123/school.jpg";

test("ImgBB upload sends base64 image in a POST, returns the direct image URL", async () => {
  let seen = false;
  const result = await uploadImageToImgBB({
    apiKey: "  private-key  ",
    bytes,
    name: "school.jpg",
    fetchImpl: async (url, options) => {
      seen = true;
      assert.equal(url, "https://api.imgbb.com/1/upload?key=private-key");
      assert.equal(options.method, "POST");
      assert.equal(options.body.get("image"), bytes.toString("base64"));
      assert.equal(options.body.get("name"), "school.jpg");
      assert.equal(options.cache, "no-store");
      return Response.json({ success: true, status: 200, data: { id: "my-id", url: imgbbUrl } });
    }
  });
  assert.equal(seen, true);
  assert.deepEqual(result, { photoUrl: imgbbUrl, imageId: "my-id" });
});

test("ImgBB key is required server-side", async () => {
  await assert.rejects(uploadImageToImgBB({
    apiKey: "", bytes,
    fetchImpl: () => { throw Error("Should not call ImgBB"); }
  }), e => e.status === 503 && /IMGBB_API_KEY/.test(e.message));
});

test("ImgBB API errors and network failures do not produce a stored URL", async () => {
  await assert.rejects(uploadImageToImgBB({
    apiKey: "secret", bytes,
    fetchImpl: async () => Response.json({ success: false, error: { message: "bad key" } }, { status: 400 })
  }), e => e.status === 502 && !e.message.includes("secret"));
  await assert.rejects(uploadImageToImgBB({
    apiKey: "secret", bytes,
    fetchImpl: async () => { throw Error("connection refused"); }
  }), e => e.status === 502);
});

test("ImgBB direct image URL is required; viewer or malicious URLs are rejected", async () => {
  for (const url of [
    "http://i.ibb.co/abc/school.jpg",
    "https://ibb.co/abc123",
    "https://i.ibb.co.evil.example/school.jpg",
    "https://evil.example/school.jpg",
    "javascript:alert(1)", ""
  ]) {
    assert.equal(isImgBBImageUrl(url), false);
    await assert.rejects(uploadImageToImgBB({
      apiKey: "secret", bytes,
      fetchImpl: async () => Response.json({ success: true, data: { url } })
    }), e => e.status === 502);
  }
  assert.equal(isImgBBImageUrl(imgbbUrl), true);
});
