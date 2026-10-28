const BANGLA = "০১২৩৪৫৬৭৮৯";
const ARABIC = "٠١٢٣٤٥٦٧٨٩";
export function toAsciiDigits(value) {
  return String(value ?? "").replace(/[০-৯٠-٩]/g, digit => {
    const banglaIndex = BANGLA.indexOf(digit);
    return String(banglaIndex >= 0 ? banglaIndex : ARABIC.indexOf(digit));
  });
}
export function toBanglaDigits(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value).replace(/[0-9]/g, digit => BANGLA[Number(digit)]);
}
export function parseBanglaNumber(value) {
  const text = toAsciiDigits(value).replace(/,/g, "").trim();
  if (!text || !/^-?(?:\d+\.?\d*|\.\d+)$/.test(text)) return NaN;
  return Number(text);
}
const grades = {
  6: "ষষ্ঠ (৬) শ্রেণি",
  7: "সপ্তম (৭) শ্রেণি",
  8: "অষ্টম (৮) শ্রেণি",
  9: "নবম (৯) শ্রেণি",
  10: "দশম (১০) শ্রেণি"
};
export function gradeLabel(value) {
  const grade = parseBanglaNumber(value);
  return grades[grade] || (Number.isFinite(grade) ? "শ্রেণি " + toBanglaDigits(grade) : "—");
}
