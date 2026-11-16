import {getStudentSubjects,evaluateTranscript} from "./academic.js";

export const SUMMARY_GROUPS=[["science","Science"],["business","Business Studies"],["humanities","Humanities"]];
const GROUP_LABEL=Object.fromEntries(SUMMARY_GROUPS);
export const SUBJECT_GRADES=["A+","A","A-","B","C","D","F"];

const entered=v=>v!==undefined&&v!==null&&v!=="";
const sameGrade=(student,grade)=>Number(student.grade)===Number(grade);

/**
 * Result summary for one exam, scoped by the marks page filters.
 *  grade: "all" or 6..10 · group: "" (all) or a group id (applies to classes 9–10)
 *  subjectId: "" for the overall view, or one subject id for the subject view.
 * Pass/fail and GPA counts use complete results only; GPA 4+ / 3+ are cumulative.
 */
export function buildResultSummary({students,marks,grade="all",group="",subjectId=""}){
 const markMaps=new Map();
 for(const m of marks||[]){
  const map=markMaps.get(m.studentId)||{};
  map[m.subjectId]=m.scores||{};markMaps.set(m.studentId,map);
 }
 const scoped=(students||[]).filter(s=>(grade==="all"||sameGrade(s,grade))&&
  (!group||(Number(s.grade)>=9&&s.group===group)));
 const info=scoped.map(student=>{
  const marksOf=markMaps.get(student.id)||{};
  const appeared=Object.values(marksOf).some(sc=>sc&&Object.values(sc).some(entered));
  let report=null;
  try{report=evaluateTranscript(student,marksOf)}catch{report=null}
  return {student,appeared,report};
 });

 // Row units: all classes → one row per class (9–10 split into groups unless a
 // group is chosen); class 9/10 with all groups → one row per group; else one row.
 const units=[];
 const addClass=c=>{
  if(c>=9&&!group){
   units.push({label:"Class "+c,kind:"head",match:x=>sameGrade(x.student,c)});
   for(const [g,label] of SUMMARY_GROUPS)units.push({label,kind:"sub",match:x=>sameGrade(x.student,c)&&x.student.group===g});
  }else units.push({label:"Class "+c+(c>=9&&group?" · "+GROUP_LABEL[group]:""),kind:"row",match:x=>sameGrade(x.student,c)});
 };
 if(grade==="all"){for(const c of [6,7,8,9,10])if(!group||c>=9)addClass(c);}
 else addClass(Number(grade));
 const unitRows=units.map(u=>({...u,list:info.filter(u.match)})).filter(u=>u.kind==="head"||u.list.length);
 // Drop a class header whose groups are all empty.
 const visible=unitRows.filter((u,i)=>u.kind!=="head"||u.list.length||unitRows[i+1]?.kind==="sub");

 if(subjectId){
  const subjectRows=list=>list.map(x=>x.report?.rows.find(r=>r.subjectId===subjectId)).filter(r=>r&&r.status==="complete");
  const line=(label,kind,list)=>{
   const rows=subjectRows(list);
   const pass=rows.filter(r=>r.passed).length;
   const grades=Object.fromEntries(SUBJECT_GRADES.map(g=>[g,rows.filter(r=>r.letter===g).length]));
   return {label,kind,appeared:rows.length,pass,fail:rows.length-pass,passRate:rate(pass,rows.length),grades};
  };
  const rows=visible.map(u=>line(u.label,u.kind,u.list)).filter(r=>r.kind==="head"||r.appeared);
  const subjectName=info.flatMap(x=>{try{return getStudentSubjects(x.student)}catch{return []}}).find(s=>s.id===subjectId)?.name||subjectId;
  return {mode:"subject",subjectName,rows,total:rows.filter(r=>r.kind!=="head").length>1?line("Total","total",info):null};
 }

 const line=(label,kind,list)=>{
  const appeared=list.filter(x=>x.appeared);
  const done=appeared.filter(x=>x.report?.complete);
  const passed=done.filter(x=>x.report.passed);
  return {label,kind,enrolled:list.length,appeared:appeared.length,pass:passed.length,fail:done.length-passed.length,
   passRate:rate(passed.length,done.length),
   gpa5:passed.filter(x=>x.report.gpa>=5).length,
   gpa4:passed.filter(x=>x.report.gpa>=4).length,
   gpa3:passed.filter(x=>x.report.gpa>=3).length};
 };
 const rows=visible.map(u=>line(u.label,u.kind,u.list));
 const total=rows.filter(r=>r.kind!=="head").length>1?line("Total","total",info):null;

 // Subject-wise fail: columns are classes (all classes), groups (class 9/10, all groups) or one column.
 const columns=grade==="all"
  ?[6,7,8,9,10].filter(c=>!group||c>=9).map(c=>({label:"Class "+c,match:x=>sameGrade(x.student,c)}))
  :(Number(grade)>=9&&!group)?SUMMARY_GROUPS.map(([g,label])=>({label,match:x=>x.student.group===g}))
  :[];
 const stats=new Map();
 for(const x of info){
  if(!x.appeared||!x.report)continue;
  for(const r of x.report.rows){
   if(r.status!=="complete")continue;
   const s=stats.get(r.subjectId)||{subjectId:r.subjectId,name:r.subject.name,took:0,fail:0,per:columns.map(()=>null)};
   s.took++;if(!r.passed)s.fail++;
   columns.forEach((c,i)=>{if(c.match(x)){s.per[i]=(s.per[i]||0)+(r.passed?0:1)}});
   stats.set(r.subjectId,s);
  }
 }
 const subjects=[...stats.values()].map(s=>({...s,failRate:rate(s.fail,s.took)}))
  .sort((a,b)=>b.fail-a.fail||b.failRate-a.failRate||a.name.localeCompare(b.name));
 return {mode:"overall",rows,total,columns:columns.map(c=>c.label),subjects};
}
function rate(a,b){return b?Math.round(a/b*1000)/10:null}
