import {evaluateTranscript} from "./academic.js";
export function buildClassResultMetrics(student,students,marks){
 const ownGrade=Number(student.grade),ownGroup=ownGrade>=9?String(student.group||""):"";
 const cohort=students.filter(s=>Number(s.grade)===ownGrade&&(ownGrade<9||String(s.group||"")===ownGroup)&&!s.deleting);
 const results=cohort.map(s=>{
  const scoreMap=Object.fromEntries(marks.filter(m=>m.studentId===s.id).map(m=>[m.subjectId,m.scores]));
  return {student:s,report:evaluateTranscript(s,scoreMap)};
 });
 const highest={};
 for(const {report} of results)for(const row of report.rows){
  if(row.status!=="complete")continue;
  highest[row.subjectId]=Math.max(highest[row.subjectId]??0,row.received);
 }
 const sorted=results.filter(x=>x.report.complete).sort((a,b)=>
   (b.report.gpa??-1)-(a.report.gpa??-1)||b.report.total-a.report.total||
   Number(a.student.roll)-Number(b.student.roll));
 const position=sorted.findIndex(x=>x.student.id===student.id);
 return {highest,rank:position>=0?position+1:null,rankOf:sorted.length,cohortSize:cohort.length};
}
export function markGroupForReport(subject){
 const parts=subject.parts||[];
 const map=new Map();
 for(const part of parts){
  const name=part.paper||(part.key==="first"?"১ম পত্র":part.key==="second"?"২য় পত্র":"");
  const title=name?(name.startsWith(subject.name)?name:subject.name+" "+name):subject.name;
  if(!map.has(title))map.set(title,{title,parts:[]});
  map.get(title).parts.push(part);
 }
 return [...map.values()];
}
