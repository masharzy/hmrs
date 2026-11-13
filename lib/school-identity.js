import { toAsciiDigits, parseBanglaNumber } from "./bangla-numbers.js";

export function classKey(grade) {
 return toAsciiDigits(grade);
}
export function studentKey(grade,roll){
 return classKey(grade)+"-"+parseBanglaNumber(roll);
}
export function canAccessGrade(actor,grade){
 if(actor.role==="principal")return true;
 if(actor.role==="teacher" && !(actor.assignedClasses||[]).length)return true;
 if(!["teacher","class_teacher"].includes(actor.role))return false;
 const target=classKey(grade);
 return (actor.assignedClasses||[]).some(value=>String(value).split("-")[0]===target);
}
