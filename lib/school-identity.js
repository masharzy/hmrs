import { toAsciiDigits, parseBanglaNumber } from "./bangla-numbers.js";

export function classKey(grade) {
 return toAsciiDigits(grade);
}
export function studentKey(grade,roll){
 return classKey(grade)+"-"+parseBanglaNumber(roll);
}
export function canAccessGrade(actor,grade){
 if(actor.role==="principal"||actor.role==="teacher")return true;
 if(actor.role!=="class_teacher")return false;
 const target=classKey(grade);
 return (actor.assignedClasses||[]).some(value=>String(value).split("-")[0]===target);
}
