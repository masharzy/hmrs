import { parseBanglaNumber } from "./bangla-numbers.js";
import { normalizeBDPhone } from "./admission-validation.js";

const trim = (value, max=350) => typeof value === "string" ? value.trim().slice(0,max) : "";
const invalid = message => Object.assign(new Error(message), { status: 400 });
export const groupNames = { science:"বিজ্ঞান", business:"ব্যবসায় শিক্ষা", humanities:"মানবিক" };
export const studentEditableKeys = [
 "name","grade","roll","group","dob","gender","birthRegistration",
 "fatherName","fatherPhone","motherName","motherPhone","guardianAddress",
 "previousSchool","phone","elective","fourthSubject","optionalId"
];
export const admissionEditableKeys = [
 "studentName","dob","birthRegistration","gender","grade","group",
 "fatherName","fatherPhone","motherName","motherPhone","studentPhone",
 "guardianAddress","previousSchool","previousClass","previousResult",
 "paymentMethod","paymentReference"
];

export function formatClass(grade, group) {
  return String(grade) + (parseBanglaNumber(grade)>=9 && groupNames[group] ? " · " + groupNames[group] : "");
}
export function normalizeStudentEdit(raw={}) {
  const grade=parseBanglaNumber(raw.grade),roll=parseBanglaNumber(raw.roll);
  if(!Number.isInteger(grade)||grade<6||grade>10)throw invalid("শ্রেণি ৬ থেকে ১০ নির্বাচন করুন");
  if(!Number.isInteger(roll)||roll<1||roll>9999)throw invalid("রোল ১ থেকে ৯৯৯৯ হতে হবে");
  const name=trim(raw.name,100);
  if(name.length<2)throw invalid("শিক্ষার্থীর পূর্ণ নাম দিন");
  const group=grade>=9?trim(raw.group,20):"";
  if(grade>=9&&!groupNames[group])throw invalid("নবম–দশম শ্রেণির জন্য বিভাগ নির্বাচন করুন");
  const phone=normalizeBDPhone(raw.phone);
  if(!phone)throw invalid("লগইনের জন্য সঠিক মোবাইল নম্বর দিন");
  const optionalPhone=value => trim(value)?normalizeBDPhone(value):"";
  const fatherPhone=optionalPhone(raw.fatherPhone),motherPhone=optionalPhone(raw.motherPhone);
  if(trim(raw.fatherPhone)&&!fatherPhone)throw invalid("পিতার মোবাইল নম্বর সঠিক নয়");
  if(trim(raw.motherPhone)&&!motherPhone)throw invalid("মাতার মোবাইল নম্বর সঠিক নয়");
  return {
    name,grade,roll,group,phone,
    dob:trim(raw.dob,20),gender:trim(raw.gender,15),
    birthRegistration:trim(raw.birthRegistration,30),
    fatherName:trim(raw.fatherName,100),fatherPhone,
    motherName:trim(raw.motherName,100),motherPhone,
    guardianAddress:trim(raw.guardianAddress),
    previousSchool:trim(raw.previousSchool,150),
    elective:grade>=9?trim(raw.elective,30):"",
    fourthSubject:grade>=9?trim(raw.fourthSubject,30):"",
    optionalId:grade>=9?trim(raw.optionalId,30):""
  };
}
