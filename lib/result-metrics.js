import {evaluateTranscript} from "./academic.js";
export function buildClassResultMetrics(student,students,marks){
 const ownGrade=Number(student.grade),ownGroup=ownGrade>=9?String(student.group||""):"";
 const cohort=students.filter(s=>Number(s.grade)===ownGrade&&(ownGrade<9||String(s.group||"")===ownGroup)&&!s.deleting);
 const results=cohort.map(s=>{
  const scoreMap=Object.fromEntries(marks.filter(m=>m.studentId===s.id).map(m=>[m.subjectId,m.scores]));
  return {student:s,report:evaluateTranscript(s,scoreMap)};
 });
 const highest={},paperHighest={};
 for(const {student:peer,report} of results){
  const scoreMap=Object.fromEntries(marks.filter(m=>m.studentId===peer.id).map(m=>[m.subjectId,m.scores||{}]));
  for(const row of report.rows){
   if(row.status==="complete")highest[row.subjectId]=Math.max(highest[row.subjectId]??0,row.received);
   const scores=scoreMap[row.subjectId]||{};
   const groups=row.legacy&&row.legacyParts?[{title:legacyTitle(row.subject),parts:row.legacyParts}]:markGroupForReport(row.subject);
   for(const group of groups){
    const values=group.parts.map(part=>scores[part.key]);
    if(values.some((v,i)=>v===null||v===undefined||v===""||!Number.isFinite(Number(v))||Number(v)<0||Number(v)>group.parts[i].max))continue;
    const id=row.subjectId+"::"+group.title;
    const value=values.reduce((total,n)=>total+Number(n),0);
    paperHighest[id]=Math.max(paperHighest[id]??0,value);
   }
  }
 }
 // Ranking (school policy):
 //  - Only complete results are ranked; incomplete results are provisional.
 //  - Order by total obtained marks (4th subject counted in full), highest first.
 //  - Equal totals: the smaller admission roll stays ahead. Positions stay
 //    sequential (roll 1 & roll 3 tied → roll 1 is 1st, roll 3 is 2nd).
 //  - rank = overall position among everyone ranked (pass or fail).
 //  - meritRank = position among students who passed only; failed → null ("—").
 const byTotal=(a,b)=>b.report.total-a.report.total||Number(a.student.roll)-Number(b.student.roll);
 const ranked=results.filter(x=>x.report.complete).sort(byTotal);
 const merit=ranked.filter(x=>x.report.passed);
 const position=list=>{const i=list.findIndex(x=>x.student.id===student.id);return i>=0?i+1:null};
 return {highest,paperHighest,rank:position(ranked),rankOf:ranked.length,
  meritRank:position(merit),meritOf:merit.length,cohortSize:cohort.length};
}
export function legacyTitle(subject){
 return subject.legacyTitle||subject.name+" (পুরোনো নম্বর)";
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
