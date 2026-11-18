import {parseBanglaNumber} from "./bangla-numbers.js";

// Old loginPhones documents only have uid. Keep those documents valid.
export function studentPhoneOwners(record={}){
 const values=[record?.uid,...(Array.isArray(record?.studentUids)?record.studentUids:[])];
 return [...new Set(values.filter(uid=>typeof uid==="string"&&uid.length>0))];
}
export function addStudentPhoneOwner(record,uid){
 if(typeof uid!=="string"||!uid)throw Error("Student account ID is required");
 const previous=studentPhoneOwners(record);
 if(previous.length>=20&&!previous.includes(uid))
  throw Object.assign(Error("Too many accounts on this phone; contact the Head Teacher"),{status:409});
 const owners=[...new Set([...previous,uid])];
 return {uid:owners[0],studentUids:owners,kind:"student",createdAt:record?.createdAt||new Date().toISOString()};
}
export function removeStudentPhoneOwner(record,uid){
 const owners=studentPhoneOwners(record).filter(owner=>owner!==uid);
 return owners.length?{uid:owners[0],studentUids:owners,kind:"student",
   createdAt:record?.createdAt||new Date().toISOString()}:null;
}
export function isSharedStudentPhone(record){
 return studentPhoneOwners(record).length>1;
}
export function studentLoginIdentity(raw={}){
 const grade=parseBanglaNumber(raw.grade),roll=parseBanglaNumber(raw.roll);
 const group=grade>=9?raw.group:"";
 if(!Number.isInteger(grade)||grade<6||grade>10||
    !Number.isInteger(roll)||roll<1||roll>9999||
    (grade>=9&&!["science","business","humanities"].includes(group)))
   return null;
 return {grade,roll,group};
}
export function sameLoginIdentity(student,identity){
 if(!identity||!student)return false;
 return Number(student.grade)===identity.grade&&Number(student.roll)===identity.roll&&
  (identity.grade<9||student.group===identity.group);
}
