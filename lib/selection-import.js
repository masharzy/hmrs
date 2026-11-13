import { validatePartialMarkForStudent, getSubjects } from "./academic.js";
import { sameStudentRoll } from "./school-identity.js";
const groupOptions=new Set(["science","business","humanities"]);
export const SELECTION_EXAM_NAME="নির্বাচনী পরীক্ষা ২০২৬";
const compactName=name=>String(name||"").normalize("NFKC").toLowerCase().replace(/[\u200c\u200d\u09bc\s.\-]/g,"");
export function normalizeSelectionPack(data){
 if(!data||data.version!==1||!Array.isArray(data.students)||data.students.length<1||data.students.length>120)
  throw Object.assign(Error("সঠিক Excel import JSON ফাইল দিন (সর্বোচ্চ ১২০ জন)"),{status:400});
 const keys=new Set(),records=[];
 for(const item of data.students){
  const roll=Number(item.roll),grade=Number(item.grade),group=item.group,name=String(item.name||"").trim();
  if(grade!==10||!groupOptions.has(group)||!Number.isSafeInteger(roll)||roll<1||roll>9999||!name||name.length>120)
   throw Object.assign(Error("শ্রেণি/বিভাগ/রোল/নাম সঠিক নয়"),{status:400});
  const key=grade+"-"+group+"-"+roll;
  if(keys.has(key))throw Object.assign(Error("ফাইলে একই শ্রেণি-বিভাগ-রোল একাধিকবার রয়েছে: "+key),{status:409});
  keys.add(key);
  if(!item.marks||typeof item.marks!=="object"||Array.isArray(item.marks))
   throw Object.assign(Error("নম্বর রেকর্ডের গঠন সঠিক নয়"),{status:400});
  const cleanMarks={};
  for(const [subjectId,scores] of Object.entries(item.marks)){
   if(!/^[a-z0-9-]{2,45}$/.test(subjectId)||!scores||typeof scores!=="object"||Array.isArray(scores))
    throw Object.assign(Error("বিষয় বা নম্বরের তথ্য সঠিক নয়"),{status:400});
   const valid={};
   for(const [part,value] of Object.entries(scores)){
    if(!/^[a-zA-Z0-9]{2,35}$/.test(part)||typeof value!=="number"||!Number.isFinite(value)||value<0||value>200)
      throw Object.assign(Error(name+" এর "+subjectId+" নম্বর সঠিক নয়"),{status:400});
    valid[part]=value;
   }
   if(Object.keys(valid).length)cleanMarks[subjectId]=valid;
  }
  records.push({grade,group,roll,name,row:Number(item.row)||0,marks:cleanMarks});
 }
 return records;
}
export function intendedStreamRoll(grade,group,roll){
 const number=Number(roll);
 if(![9,10].includes(Number(grade))||!Number.isSafeInteger(number))return number;
 if(group==="business"&&number>=101&&number<=199)return number-100;
 if(group==="humanities"&&number>=201&&number<=299)return number-200;
 return number;
}
export function incompleteStudentFields(student){
 const names={phone:"লগইন মোবাইল",dob:"জন্মতারিখ",birthRegistration:"জন্মনিবন্ধন",
   gender:"লিঙ্গ",fatherName:"পিতার নাম",fatherPhone:"পিতার মোবাইল",
   motherName:"মাতার নাম",motherPhone:"মাতার মোবাইল",guardianAddress:"অভিভাবকের ঠিকানা"};
 const missing=Object.entries(names).filter(([key])=>!String(student?.[key]||"").trim()).map(([,label])=>label);
 if(!student?.uid)missing.push("লগইন PIN/অ্যাকাউন্ট");
 return missing;
}
export function importedStudent(record,at=new Date().toISOString()){
 const elective=record.group==="science"?"higher-math":record.group==="humanities"?"civics":"agriculture";
 const fourthSubject="agriculture",optionalId=record.group==="science"?"biology":"agriculture";
 const student={
  name:record.name,grade:10,group:record.group,roll:record.roll,
  elective,fourthSubject,optionalId,
  phone:"",dob:"",gender:"",birthRegistration:"",fatherName:"",fatherPhone:"",
  motherName:"",motherPhone:"",guardianAddress:"",previousSchool:"",
  due:0,uid:null,importIncomplete:true,loginPending:true,
  createdAt:at,updatedAt:at,importSource:"selection-2026"
 };
 return {...student,missingFields:incompleteStudentFields(student)};
}
export function pickSelectionStudent(record,students){
 const candidates=students.filter(s=>Number(s.grade)===10&&s.group===record.group&&!s.deleting);
 const byRoll=candidates.filter(s=>intendedStreamRoll(10,record.group,s.roll)===Number(record.roll));
 const byName=candidates.filter(s=>compactName(s.name)===compactName(record.name));
 const conflict=(reason,list)=>({status:"conflict",reason,name:record.name,roll:record.roll,group:record.group,found:list.map(s=>({id:s.id,name:s.name,roll:s.roll}))});
 if(byRoll.length>1)return conflict("একই বিভাগ ও রোলের একাধিক শিক্ষার্থী আছে",byRoll);
 if(byRoll.length===1){
  const student=byRoll[0];
  const otherName=byName.filter(s=>s.id!==student.id);
  if(otherName.length)return conflict("Excel-এর নাম একই বিভাগে অন্য রোলে রয়েছে; আগে যাচাই করুন",[student,...otherName]);
  return {status:"matched",student,normalizeRoll:Number(student.roll)!==Number(record.roll),
   rename:compactName(student.name)!==compactName(record.name)};
 }
 if(byName.length>1)return conflict("একই নামে একাধিক শিক্ষার্থী রয়েছে",byName);
 if(byName.length===1)return {status:"matched",student:byName[0],normalizeRoll:Number(byName[0].roll)!==Number(record.roll),rename:false};
 return {status:"create",name:record.name,roll:record.roll,group:record.group,reason:"নতুন শিক্ষার্থীর অসম্পূর্ণ প্রোফাইল তৈরি হবে"};
}
/** A standalone roll conversion never changes student identity or exam marks. */
export function planStreamRollChanges(students){
 const rows=students.filter(s=>[9,10].includes(Number(s.grade))&&["business","humanities"].includes(s.group)&&!s.deleting);
 const occupied=new Map(),out=[],conflicts=[];
 for(const student of rows){
  const key=student.grade+"-"+student.group+"-"+student.roll;
  occupied.set(key,[...(occupied.get(key)||[]),student]);
 }
 for(const s of rows){
  const target=intendedStreamRoll(s.grade,s.group,s.roll);
  if(target===Number(s.roll))continue;
  const current=occupied.get(s.grade+"-"+s.group+"-"+target)||[];
  if(current.some(other=>other.id!==s.id)){
   conflicts.push({id:s.id,name:s.name,grade:s.grade,group:s.group,oldRoll:s.roll,roll:target,
    reason:"নতুন রোল অন্য শিক্ষার্থী ব্যবহার করছেন"});continue;
  }
  out.push({id:s.id,name:s.name,grade:Number(s.grade),group:s.group,oldRoll:Number(s.roll),roll:target});
 }
 return {changes:out,conflicts};
}
export function selectionMarksFor(student,record){
 const out=[],skipped=[];
 for(const [subjectId,scores] of Object.entries(record.marks)){
  try{const parsed=validatePartialMarkForStudent(student,subjectId,scores);out.push({subjectId,scores:parsed})}
  catch(e){skipped.push({subjectId,reason:e.message})}
 }
 return {out,skipped};
}
