import {test} from "node:test";
import assert from "node:assert/strict";
import {normalizeStudentEdit,formatClass} from "../lib/student-admin.js";
import {normalizeAdmissionData,validateAdmission} from "../lib/admission-validation.js";
import {admissionSchema} from "../lib/admission-schema.js";
import {classKey,studentKey,canAccessGrade} from "../lib/school-identity.js";

const base={
 name:"সুমাইয়া আক্তার",grade:"৯",roll:"০৫",group:"science",
 phone:"+৮৮০১৭১২৩৪৫৬৭৮",fatherName:"আবদুর রহমান",fatherPhone:"০১৮১২৩৪৫৬৭৮",
 motherName:"সালমা",motherPhone:"০১৯১২৩৪৫৬৭৮",dob:"2011-01-01",
 birthRegistration:"12345678901234567",gender:"female",
 guardianAddress:"সোনারগাঁ, নারায়ণগঞ্জ",previousSchool:"সোনারগাঁ প্রাথমিক",
 elective:"higher-math",fourthSubject:"agriculture",optionalId:"biology"
};
test("principal student edit supports Bangla digits, class/group and login phone",()=>{
 const s=normalizeStudentEdit(base);
 assert.equal(s.grade,9);assert.equal(s.roll,5);
 assert.equal(s.group,"science");assert.equal(s.phone,"01712345678");
 assert.equal(s.fatherPhone,"01812345678");
 assert.equal(formatClass("৯","science"),"৯ · বিজ্ঞান");
 assert.equal(formatClass(7,"science"),"7");
});
test("classes 6-8 have neither groups nor sections",()=>{
 const s=normalizeStudentEdit({...base,grade:"৭",group:"science"});
 assert.equal(s.group,"");
 assert.equal(s.elective,"");assert.equal(s.fourthSubject,"");assert.equal(s.optionalId,"");
 assert.equal("section" in s,false);
});
test("grade 9/10 requires valid group and grade/roll limits",()=>{
 assert.throws(()=>normalizeStudentEdit({...base,group:""}),/বিভাগ/);
 assert.throws(()=>normalizeStudentEdit({...base,roll:"০"}),/রোল/);
 assert.throws(()=>normalizeStudentEdit({...base,roll:"১০০০০"}),/রোল/);
 assert.throws(()=>normalizeStudentEdit({...base,phone:"abc"}),/মোবাইল/);
 assert.equal(normalizeStudentEdit({...base,grade:"১০",group:"humanities"}).group,"humanities");
});
test("admission normalization never sends a section, with a mandatory group only for 9 and 10",()=>{
 const raw={
  studentName:"সুমাইয়া আক্তার",dob:"2013-01-01",birthRegistration:"12345678901234567",gender:"female",
  grade:"৬",section:"a",group:"science",
  fatherName:"আবদুর রহমান",fatherPhone:"01712345678",
  motherName:"সালমা",motherPhone:"01812345678",studentPhone:"01912345678",
  guardianAddress:"সোনারগাঁ, নারায়ণগঞ্জ, ঢাকা",
  previousSchool:"সোনারগাঁ প্রাথমিক",paymentMethod:"later"
 };
 const lower=normalizeAdmissionData(raw);
 assert.equal("section" in lower,false);assert.equal(lower.group,"");
 assert.deepEqual(validateAdmission(raw),{});
 assert.equal(admissionSchema.safeParse(lower).success,true);
 assert.equal(validateAdmission({...raw,grade:"৯",group:""}).group,"বিভাগ নির্বাচন করুন।");
 const upper=normalizeAdmissionData({...raw,grade:"৯",group:"business"});
 assert.equal(admissionSchema.safeParse(upper).success,true);
 assert.equal(upper.group,"business");
});

test("student IDs are grade-roll only and class teachers retain access to legacy grade-section assignments",()=>{
 assert.equal(classKey("৯"),"9");
 assert.equal(studentKey("৯","০৫"),"9-5");
 const old={role:"class_teacher",assignedClasses:["9-a","10-b"]};
 assert.equal(canAccessGrade(old,9),true);
 assert.equal(canAccessGrade(old,"১০"),true);
 assert.equal(canAccessGrade(old,8),false);
 const current={role:"class_teacher",assignedClasses:["6","7"]};
 assert.equal(canAccessGrade(current,6),true);
 assert.equal(canAccessGrade(current,9),false);
 assert.equal(canAccessGrade({role:"principal",assignedClasses:[]},8),true);
 assert.equal(canAccessGrade({role:"student",assignedClasses:[]},8),false);
});
