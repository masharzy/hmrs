import { z } from "zod";
import { db } from "../../../lib/firebase-admin";
import { fail, handleError, json, verifyOrigin } from "../../../lib/server-auth";
const field = (limit = 100) => z.string().trim().min(1).max(limit);
const optional = (limit = 100) => z.string().trim().max(limit).optional().default("");
const phone = z.string().regex(/^01[3-9][0-9]{8}$/, "১১ সংখ্যার মোবাইল নম্বর দিন");
const schema = z.object({
  studentName: field(), dob: field(20), gender: z.enum(["male", "female", "other"]),
  grade: z.coerce.number().int().min(6).max(10), section: field(10),
  group: z.enum(["science", "business", "humanities"]).optional().default("science"),
  fatherName: field(), fatherPhone: phone, motherName: field(), motherPhone: phone,
  guardianAddress: field(350), birthRegistration: field(40),
  previousSchool: field(150), previousClass: optional(30), previousResult: optional(80),
  paymentMethod: z.enum(["mobile_banking", "online_banking", "later"]),
  paymentReference: optional(70),
  website: optional(120)
});
export async function POST(req) {
  try {
    verifyOrigin(req);
    if (Number(req.headers.get("content-length") || 0) > 16000) return fail("অনুরোধটি অনেক বড়", 413);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const data = parsed.data;
    if (data.website) return json({ ok: true, message: "আবেদন গ্রহণ করা হয়েছে" });
    const doc = await db().collection("admissions").add({
      ...data, website: undefined, status: "pending", paymentStatus: "unverified",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
    return json({ ok: true, applicationId: doc.id, status: "pending" }, 201);
  } catch (e) { return handleError(e); }
}