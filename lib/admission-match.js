import {parseBanglaNumber} from "./bangla-numbers.js";
import {sameStudentRoll} from "./school-identity.js";
import {fourthSubjectSelection,selectedFourthSubject} from "./academic.js";
export function findApplicantRosterMatch(application,students,roll){
 const n=parseBanglaNumber(roll??application.requestedRoll);
 if(!Number.isInteger(n)||n<=0)return {match:null,conflicts:[]};
 const found=students.filter(s=>!s.deleting&&sameStudentRoll(s,{grade:application.grade,group:application.group,roll:n}));
 const provisional=found.filter(s=>!s.uid);
 return {match:found.length===1&&provisional.length===1?provisional[0]:null,conflicts:found.filter(s=>s.uid||found.length>1)};
}
export function admissionSubjects(application){
 if(Number(application.grade)<9)return {elective:"",fourthSubject:"",optionalId:""};
 const choice=application.optionalSubject||selectedFourthSubject(application);
 return fourthSubjectSelection(application.group,choice);
}
