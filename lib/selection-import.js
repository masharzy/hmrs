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
export function pickSelectionStudent(record,students){
 const candidates=students.filter(s=>Number(s.grade)===10&&s.group===record.group&&!s.deleting);
 const offset=record.group==="business"?100:record.group==="humanities"?200:0;
 const byRoll=candidates.filter(s=>Number(s.roll)===record.roll||offset&&Number(s.roll)===record.roll+offset);
 const byName=byRoll.filter(s=>compactName(s.name)===compactName(record.name));
 if(byName.length!==1)return {status:"review",reason:byRoll.length?"নাম মেলেনি; স্বয়ংক্রিয় import বন্ধ":"শিক্ষার্থী পাওয়া যায়নি",name:record.name,roll:record.roll,group:record.group,found:byRoll.map(x=>({id:x.id,name:x.name,roll:x.roll}))};
 return {status:"matched",student:byName[0],normalizeRoll:Number(byName[0].roll)!==record.roll};
}
export function selectionMarksFor(student,record){
 const out=[],skipped=[];
 for(const [subjectId,scores] of Object.entries(record.marks)){
  try{const parsed=validatePartialMarkForStudent(student,subjectId,scores);out.push({subjectId,scores:parsed})}
  catch(e){skipped.push({subjectId,reason:e.message})}
 }
 return {out,skipped};
}
