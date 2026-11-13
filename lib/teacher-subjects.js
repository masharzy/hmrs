import { getSubjects } from "./academic.js";
// A school-wide list built from every subject offered in class 6-10, all groups.
const all=[...getSubjects(6),...getSubjects(9,"science"),...getSubjects(9,"business","agriculture"),...getSubjects(9,"humanities","civics")];
export const TEACHER_SUBJECT_OPTIONS=Object.freeze(
 [...new Map(all.map(s=>[s.id,{id:s.id,name:s.name}])).values()].sort((a,b)=>a.name.localeCompare(b.name,"bn"))
);
export const TEACHER_SUBJECT_IDS=new Set(TEACHER_SUBJECT_OPTIONS.map(s=>s.id));
export const CLASS_OPTIONS=[6,7,8,9,10].map(value=>({value:String(value),label:({6:"৬ষ্ঠ",7:"৭ম",8:"৮ম",9:"৯ম",10:"১০ম"})[value]}));
export function cleanAssignedClasses(values){
 return Array.isArray(values)?[...new Set(values.map(v=>String(v).replace(/[০-৯]/g,c=>String(c.charCodeAt(0)-0x09e6)).split("-")[0]).filter(v=>/^(6|7|8|9|10)$/.test(v)))]:[];
}
export function cleanTeachingSubjects(values){
 return Array.isArray(values)?[...new Set(values.map(String).filter(id=>TEACHER_SUBJECT_IDS.has(id)))]:[];
}
