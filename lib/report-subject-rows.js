import {parseBanglaNumber} from "./bangla-numbers.js";
import {markGroupForReport} from "./result-metrics.js";

/** One row per real subject. Bangla/English paper marks combine before grading.
 * Paper details remain available for screen expansion, never for printed marksheet.
 * Missing cells count as zero for provisional totals; no values are fabricated in storage.
 */
const numeric=value=>{
 if(value===null||value===undefined||value==="")return null;
 const n=parseBanglaNumber(value);
 return Number.isFinite(n)?n:null;
};
export function reportSubjectRows(report,marks={},metrics={}){
 return (report.rows||[]).map(row=>{
  const scores=marks[row.subjectId]||{};
  const legacy=row.legacy&&row.subjectId==="bangla";
  const parts=legacy?[
   {key:"cq",label:"CQ",max:140},{key:"mcq",label:"MCQ",max:60}
  ]:row.subject.parts;
  const markParts=parts.map(part=>{
   const raw=numeric(scores[part.key]);
   return {...part,received:raw??0,filled:raw!==null&&raw>=0&&raw<=part.max};
  });
  const subTotal=keys=>markParts.filter(p=>keys.includes(p.key)).reduce((sum,p)=>({
   obtained:sum.obtained+p.received,max:sum.max+p.max
  }),{obtained:0,max:0});
  const written=subTotal(["cq","firstCq","secondCq","first","second","total"]);
  const mcq=subTotal(["mcq","firstMcq","secondMcq"]);
  const practical=subTotal(["practical"]);
  const groups=legacy?[]:markGroupForReport(row.subject);
  const papers=groups.length>1?groups.map(group=>{
   const gp=markParts.filter(p=>group.parts.some(x=>x.key===p.key));
   return {title:group.title,obtained:gp.reduce((n,p)=>n+p.received,0),
    max:gp.reduce((n,p)=>n+p.max,0),
    parts:gp,complete:gp.every(p=>p.filled)};
  }):[];
  return {id:row.subjectId,name:row.subject.name,optional:row.subjectId===report.optionalId,
   legacy,subject:row.subject,written,mcq,practical,parts:markParts,papers,
   obtained:markParts.reduce((n,p)=>n+p.received,0),max:row.subject.max,
   complete:markParts.every(p=>p.filled),highest:metrics?.highest?.[row.subjectId]??null,
   grade:row.letter||"F",point:row.point??0};
 });
}
