import { z } from "zod";

const field = (limit=100) => z.string().trim().min(1).max(limit);
const optional = (limit=100) => z.string().trim().max(limit).optional().default("");

export const admissionSchema = z.object({
 studentName: field(100),
 dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
 birthRegistration: z.string().regex(/^\d{17}$/),
 gender: z.enum(["male", "female", "other"]),
 grade: z.coerce.number().int().min(6).max(10),
 group: z.enum(["science", "business", "humanities", ""]),
 requestedRoll: optional(10),
 optionalSubject: optional(30),
 fatherName: field(100),
 fatherPhone: z.string().regex(/^01[3-9]\d{8}$/),
 motherName: field(100),
 motherPhone: z.string().regex(/^01[3-9]\d{8}$/),
 studentPhone: z.string().regex(/^01[3-9]\d{8}$/),
 guardianAddress: field(350),
 previousSchool: field(150),
 previousClass: optional(30),
 previousResult: optional(80),
 paymentMethod: z.enum(["mobile_banking", "online_banking", "later"]),
 paymentReference: optional(70),
 website: optional(120)
}).strict();
