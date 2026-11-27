import { getStudentSubjects } from "./academic.js";
import { cleanAssignedClasses, cleanTeachingSubjects } from "./teacher-subjects.js";
const staffRoles=["teacher","class_teacher"];
const leadershipRoles=["principal","assistant_principal"];
export function normalizedRoles(user){
 if(user?.role==="principal")return ["principal"];
 if(user?.role==="student")return ["student"];
 const source=Array.isArray(user?.roles)?user.roles:[user?.role];
 const chosen=staffRoles.filter(r=>source.includes(r));
 return chosen.length?chosen:["teacher"];
}
export function primaryRole(roles){
 return roles.includes("principal")?"principal":roles.includes("assistant_principal")?"assistant_principal":roles.includes("staff_manager")?"staff_manager":roles.includes("class_teacher")?"class_teacher":"teacher";
}
export function teacherAssignments(input,old={}){
 const roles=staffRoles.filter(role=>input.roles?.includes(role));
 if(!roles.length)throw Object.assign(Error("শিক্ষক বা শ্রেণি শিক্ষক অন্তত একটি ভূমিকা নির্বাচন করুন"),{status:400});
 const legacy=cleanAssignedClasses(old.assignedClasses||[]);
 const teachingClasses=roles.includes("teacher")?
   cleanAssignedClasses(input.teachingClasses===undefined?old.teachingClasses||legacy:input.teachingClasses):[];
 const classTeacherClasses=roles.includes("class_teacher")?
   cleanAssignedClasses(input.classTeacherClasses===undefined?old.classTeacherClasses||legacy:input.classTeacherClasses):[];
 const teachingSubjects=cleanTeachingSubjects(input.teachingSubjects===undefined?old.teachingSubjects||[]:input.teachingSubjects);
 if(roles.includes("teacher")&&!teachingClasses.length)throw Object.assign(Error("শিক্ষক কোন কোন শ্রেণিতে পড়ান নির্বাচন করুন"),{status:400});
 if(roles.includes("class_teacher")&&!classTeacherClasses.length)throw Object.assign(Error("কোন শ্রেণির শ্রেণি শিক্ষক নির্বাচন করুন"),{status:400});
 if(!teachingSubjects.length)throw Object.assign(Error("অন্তত একটি বিষয় নির্বাচন করুন"),{status:400});
 return {roles,role:primaryRole(roles),teachingClasses,classTeacherClasses,assignedClasses:[...new Set([...teachingClasses,...classTeacherClasses])],teachingSubjects};
}
const numbers=value=>cleanAssignedClasses(value||[]).map(Number);
export function teachingGrades(actor){
 return numbers(actor?.teachingClasses||actor?.assignedClasses);
}
export function homeroomGrades(actor){
 if(!normalizedRoles(actor).includes("class_teacher"))return [];
 return numbers(actor?.classTeacherClasses||actor?.assignedClasses);
}
export function allStaffGrades(actor){
 return [...new Set([...teachingGrades(actor),...homeroomGrades(actor)])];
}
export function canViewGrade(actor,grade){
 if(leadershipRoles.includes(actor?.role))return true;
 if(!staffRoles.some(r=>normalizedRoles(actor).includes(r)))return false;
 const n=Number(grade),all=allStaffGrades(actor);
 // Legacy teacher records with no assigned classes historically had full access.
 return all.length ? all.includes(n) : actor?.role==="teacher"&&!Array.isArray(actor.roles);
}
export function canManageHomeroom(actor,grade){
 return ["principal","assistant_principal","staff_manager"].includes(actor?.role)||homeroomGrades(actor).includes(Number(grade));
}
function schoolSubjects(student){
 return getStudentSubjects(student);
}
export function canManageSubject(actor,student,subjectId){
 if(actor?.role==="principal")return true;
 if(!canViewGrade(actor,student.grade))return false;
 if(Array.isArray(actor.teachingSubjects)&&!actor.teachingSubjects.includes(subjectId))return false;
 if(Array.isArray(actor.roles)&&!teachingGrades(actor).includes(Number(student.grade))&&
   !homeroomGrades(actor).includes(Number(student.grade)))return false;
 try{return schoolSubjects(student).some(s=>s.id===subjectId)}
 catch{return false}
}
export function allowedSubjects(actor,student){
 let subjects=[];
 try{subjects=schoolSubjects(student)}
 catch{return []}
 if(leadershipRoles.includes(actor?.role))return subjects;
 if(!canViewGrade(actor,student.grade))return [];
 if(!Array.isArray(actor.teachingSubjects))return subjects;
 return subjects.filter(s=>canManageSubject(actor,student,s.id));
}
export function studentVisibleForTeaching(actor,student){
 return leadershipRoles.includes(actor?.role)||allowedSubjects(actor,student).length>0||
  homeroomGrades(actor).includes(Number(student.grade));
}
