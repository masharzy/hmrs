import {parseBanglaNumber} from "./bangla-numbers.js";
import {markGroupForReport} from "./result-metrics.js";
function numericScore(value){
 if(value===null||value===undefined||value==="")return null;
 const n=parseBanglaNumber(value);
 return Number.isFinite(n)?n:null;
}
/** One row per real exam paper; no invented first/second marks for legacy Bangla totals. */
export function reportPaperRows(report,marks={},metrics={}){
 const result=[];
 for(const subjectRow of report.rows||[]){
  const groups=markGroupForReport(subjectRow.subject);
  const scores=marks[subjectRow.subjectId]||{};
  const legacy=subjectRow.legacy&&subjectRow.subjectId==="bangla"&&subjectRow.subject.max===200;
  const shown=legacy?[{title:"বাংলা (পুরোনো একত্রিত নম্বর)",parts:[
   {key:"cq",label:"CQ (দুই পত্র)",max:140},{key:"mcq",label:"MCQ (দুই পত্র)",max:60}
  ]}]:groups;
  shown.forEach((group,index)=>{
   const parts=group.parts.map(part=>{
    const score=numericScore(scores[part.key]);
    return {...part,received:score,filled:score!==null&&score>=0&&score<=part.max};
   });
   const complete=parts.every(x=>x.filled);
   const possible=parts.reduce((n,p)=>n+p.max,0);
   const obtained=complete?parts.reduce((n,p)=>n+p.received,0):null;
   const paperKey=subjectRow.subjectId+"::"+group.title;
   result.push({
    id:paperKey,subjectId:subjectRow.subjectId,subjectName:subjectRow.subject.name,
    paperName:group.title,parts,obtained,possible,complete,
    highest:metrics.paperHighest?.[paperKey]??(shown.length===1?metrics.highest?.[subjectRow.subjectId]:null),
    optional:subjectRow.subjectId===report.optionalId,
    subjectGrade:index===0?subjectRow.letter||"—":null,
    subjectPoint:index===0?subjectRow.point??null:null,
    first:index===0,legacy
   });
  });
 }
 return result;
}
