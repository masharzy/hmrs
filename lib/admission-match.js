import {parseBanglaNumber} from "./bangla-numbers.js";
import {sameStudentRoll} from "./school-identity.js";
export function findApplicantRosterMatch(application,students,roll){
 const n=parseBanglaNumber(roll??application.requestedRoll);
 if(!Number.isInteger(n)||n<=0)return {match:null,conflicts:[]};
 const found=students.filter(s=>!s.deleting&&sameStudentRoll(s,{grade:application.grade,group:application.group,roll:n}));
 const provisional=found.filter(s=>!s.uid);
 return {match:found.length===1&&provisional.length===1?provisional[0]:null,conflicts:found.filter(s=>s.uid||found.length>1)};
}
export function admissionSubjects(application){
 const group=application.group,requested=application.optionalSubject;
 if(Number(application.grade)<9)return {elective:"",fourthSubject:"",optionalId:""};
 if(group==="science"){
  const option=["biology","higher-math","agriculture"].includes(requested)?requested:"biology";
  return {elective:option==="agriculture"?"agriculture":"higher-math",
   fourthSubject:"agriculture",optionalId:option};
 }
 if(group==="business"){
  const option=["agriculture","home-science"].includes(requested)?requested:"agriculture";
  return {elective:option,fourthSubject:option,optionalId:option};
 }
 const option=["agriculture","home-science"].includes(requested)?requested:"agriculture";
 return {elective:"civics",fourthSubject:option,optionalId:option};
}
