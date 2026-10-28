import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { toAsciiDigits } from "./bangla-numbers.js";

export const asciiDigits = toAsciiDigits;
export function normalizePhone(value) {
  const text = asciiDigits(value).trim().replace(/[\s()\-]/g, "");
  if (/^01[3-9]\d{8}$/.test(text)) return text;
  if (/^(?:\+?88)01[3-9]\d{8}$/.test(text)) return text.replace(/^\+?88/, "");
  return null;
}
export function normalizePin(value) {
  const pin = asciiDigits(value);
  return /^\d{5}$/.test(pin) ? pin : null;
}
export function makePinCredential(pin) {
  const clean = normalizePin(pin);
  if (!clean) throw Error("PIN অবশ্যই পাঁচ সংখ্যার হতে হবে");
  const salt = randomBytes(16).toString("hex");
  return { salt, hash: scryptSync(clean, Buffer.from(salt, "hex"), 64).toString("hex"), version: 1 };
}
export function verifyPin(pin, record) {
  const clean = normalizePin(pin);
  if (!clean || !/^[a-f0-9]{32}$/.test(record?.salt || "") ||
      !/^[a-f0-9]{128}$/.test(record?.hash || "")) return false;
  const actual = scryptSync(clean, Buffer.from(record.salt, "hex"), 64);
  const expected = Buffer.from(record.hash, "hex");
  return timingSafeEqual(actual, expected);
}
