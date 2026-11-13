import {gradeLabel} from "./bangla-numbers.js";
/** Legacy exams without a scope apply to all classes. */
export function examScopeGrade(exam){
 const value=exam?.scopeGrade;
 return Number.isInteger(Number(value))&&[6,7,8,9,10].includes(Number(value))?Number(value):null;
}
export function examAppliesToGrade(exam,grade){
 const scope=examScopeGrade(exam);
 return scope===null||scope===Number(grade);
}
export function examAppliesToStudent(exam,student){
 return examAppliesToGrade(exam,student?.grade);
}
export function examScopeLabel(exam){
 const grade=examScopeGrade(exam);
 return grade===null?"সব শ্রেণি":String(grade)+"ম শ্রেণি";
}
export function examStudents(exam,students){
 return (students||[]).filter(student=>!student.deleting&&examAppliesToStudent(exam,student));
}
