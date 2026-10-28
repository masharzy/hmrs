import { toAsciiDigits } from "./bangla-numbers.js";

export const ADMISSION_FIELDS = [
  ["studentName", "dob", "birthRegistration", "gender", "grade", "section", "group"],
  ["fatherName", "fatherPhone", "motherName", "motherPhone", "studentPhone", "guardianAddress"],
  ["previousSchool", "previousClass", "previousResult", "paymentMethod", "paymentReference"]
];
const isString = value => typeof value === "string";
const txt = value => (isString(value) ? value.trim() : "");
export const normalizeBDPhone = value => {
  const v = toAsciiDigits(value).trim().replace(/[\s()-]/g, "");
  if (/^01[3-9]\d{8}$/.test(v)) return v;
  if (/^(?:\+?88)01[3-9]\d{8}$/.test(v)) return v.replace(/^\+?88/, "");
  return "";
};
export function normalizeAdmissionData(raw={}) {
  return {
    studentName:txt(raw.studentName), dob:toAsciiDigits(txt(raw.dob)),
    birthRegistration:toAsciiDigits(txt(raw.birthRegistration)).replace(/\s/g,""),
    gender:txt(raw.gender), grade:toAsciiDigits(String(raw.grade ?? "")).trim(),
    section:txt(raw.section).toLowerCase(), group:txt(raw.group),
    fatherName:txt(raw.fatherName), fatherPhone:normalizeBDPhone(raw.fatherPhone),
    motherName:txt(raw.motherName), motherPhone:normalizeBDPhone(raw.motherPhone),
    studentPhone:normalizeBDPhone(raw.studentPhone), guardianAddress:txt(raw.guardianAddress),
    previousSchool:txt(raw.previousSchool),
    previousClass:toAsciiDigits(txt(raw.previousClass)),
    previousResult:toAsciiDigits(txt(raw.previousResult)),
    paymentMethod:txt(raw.paymentMethod), paymentReference:toAsciiDigits(txt(raw.paymentReference)),
    website:txt(raw.website)
  };
}
function validISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d]=value.split("-").map(Number);
  const date=new Date(Date.UTC(y,m-1,d));
  return date.getUTCFullYear()===y && date.getUTCMonth()+1===m && date.getUTCDate()===d &&
    y>=1980 && date.getTime()<=Date.now();
}
export function validateAdmissionStep(raw, step) {
  const v=normalizeAdmissionData(raw), errors={};
  if (step===0) {
    if (v.studentName.length<2) errors.studentName="শিক্ষার্থীর পূর্ণ নাম লিখুন (কমপক্ষে ২ অক্ষর)।";
    else if(v.studentName.length>100) errors.studentName="নাম ১০০ অক্ষরের মধ্যে লিখুন।";
    if (!validISODate(v.dob)) errors.dob="সঠিক জন্মতারিখ দিন; ভবিষ্যতের তারিখ গ্রহণযোগ্য নয়।";
    if (!/^\d{17}$/.test(v.birthRegistration)) errors.birthRegistration="১৭ সংখ্যার জন্মনিবন্ধন নম্বর লিখুন; বাংলা সংখ্যাও চলবে।";
    if (!["male","female","other"].includes(v.gender)) errors.gender="লিঙ্গ নির্বাচন করুন।";
    if (!["6","7","8","9","10"].includes(v.grade)) errors.grade="ষষ্ঠ থেকে দশম শ্রেণি নির্বাচন করুন।";
    if (!["a","b","c"].includes(v.section)) errors.section="শাখা নির্বাচন করুন।";
    if (+v.grade>=9 && !["science","business","humanities"].includes(v.group)) errors.group="বিভাগ নির্বাচন করুন।";
  }
  if(step===1) {
    for (const [key,label] of [["fatherName","পিতার"],["motherName","মাতার"]]) {
      if (v[key].length<2) errors[key]=label+" পূর্ণ নাম লিখুন।";
      else if(v[key].length>100) errors[key]=label+" নাম ১০০ অক্ষরের মধ্যে রাখুন।";
    }
    for (const [key,label] of [["fatherPhone","পিতার"],["motherPhone","মাতার"],["studentPhone","লগইনের"]]) {
      if (!v[key]) errors[key]=label+" বৈধ ১১ সংখ্যার মোবাইল নম্বর লিখুন (01 বা +880)।";
    }
    if(v.guardianAddress.length<8) errors.guardianAddress="পূর্ণ ঠিকানা লিখুন (কমপক্ষে ৮ অক্ষর)।";
    else if(v.guardianAddress.length>350) errors.guardianAddress="ঠিকানা ৩৫০ অক্ষরের মধ্যে লিখুন।";
  }
  if(step===2) {
    if(v.previousSchool.length<2) errors.previousSchool="আগের বিদ্যালয়ের নাম লিখুন।";
    else if(v.previousSchool.length>150) errors.previousSchool="বিদ্যালয়ের নাম ১৫০ অক্ষরের মধ্যে লিখুন।";
    if(v.previousClass.length>30) errors.previousClass="পূর্ববর্তী শ্রেণি ৩০ অক্ষরের মধ্যে লিখুন।";
    if(v.previousResult.length>80) errors.previousResult="ফলাফল ৮০ অক্ষরের মধ্যে লিখুন।";
    if(!["mobile_banking","online_banking","later"].includes(v.paymentMethod))
      errors.paymentMethod="পেমেন্টের মাধ্যম নির্বাচন করুন।";
    if(v.paymentReference.length>70) errors.paymentReference="রেফারেন্স নম্বর ৭০ অক্ষরের মধ্যে লিখুন।";
  }
  return errors;
}
export function validateAdmission(raw) {
  const errors={};
  for(let step=0;step<3;step++)Object.assign(errors,validateAdmissionStep(raw,step));
  return errors;
}
export function firstInvalidStep(errors){
  for(let step=0;step<3;step++)if(ADMISSION_FIELDS[step].some(key=>errors[key]))return step;
  return -1;
}
