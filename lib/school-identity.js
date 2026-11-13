import { toAsciiDigits, parseBanglaNumber } from "./bangla-numbers.js";

export function classKey(grade) {
 return toAsciiDigits(grade);
}
export function studentKey(grade,roll,group=""){
 const n=parseBanglaNumber(grade),r=parseBanglaNumber(roll);
 const stream=n>=9&&["science","business","humanities"].includes(group)?"-"+group:"";
 return classKey(grade)+stream+"-"+r;
}
/** Group-specific roll is unique for 9–10; no group for 6–8. */
export function sameStudentRoll(a,b){
 return Number(a.grade)===Number(b.grade)&&Number(a.roll)===Number(b.roll)&&
  (Number(a.grade)<9||String(a.group||"")===String(b.group||""));
}
export function canAccessGrade(actor,grade){
 if(actor.role==="principal")return true;
 if(actor.role==="teacher" && !(actor.assignedClasses||[]).length)return true;
 if(!["teacher","class_teacher"].includes(actor.role))return false;
 const target=classKey(grade);
 return (actor.assignedClasses||[]).some(value=>String(value).split("-")[0]===target);
}
