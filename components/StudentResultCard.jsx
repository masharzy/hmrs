"use client";
import React,{useState} from "react";
import {Printer,AlertTriangle,ChevronDown,ChevronUp} from "lucide-react";
import {reportSubjectRows} from "../lib/report-subject-rows.js";
import {enNumber} from "../lib/result-english.js";
const n=v=>enNumber(v??0),g=v=>Number(v??0).toFixed(2);
const score=x=>x.max?n(x.obtained)+" / "+n(x.max):"—";
export default function StudentResultCard({exam,result,metrics,marks,onPrint,isAdmin=false}){
 const rows=reportSubjectRows(result,marks||{},metrics);
 const [expanded,setExpanded]=useState({});
 return <section className="panel hmrs-student-result-card" aria-label={exam.name+" result"}>
  <div className="hmrs-student-result-top">
   <div><h2>{exam.name}</h2><p>{isAdmin?"Selected student's result":"Your personal result"} · Subject-wise grades</p></div>
   <button className="btn sm" type="button" onClick={onPrint}><Printer size={14}/> Save PDF / Print</button>
  </div>
  <div className="hmrs-mark-totals">
   <div><small>Obtained / Full Marks</small><b>{n(rows.reduce((t,r)=>t+r.obtained,0))} / {n(result.maxTotal)}</b></div>
   <div><small>GPA (without 4th)</small><b>{g(result.withoutFourthGpa)}</b></div>
   <div><small>GPA (with 4th)</small><b>{g(result.withFourthGpa)}</b></div>
   <div><small>Grade</small><b>{result.letter}</b></div>
   <div><small>Position (Class / Group)</small><b>{metrics?.rank?n(metrics.rank)+" / "+n(metrics.rankOf):"Not ranked"}</b></div>
  </div>
  {!result.complete&&<p className="hmrs-result-not-ready"><AlertTriangle size={16}/>
   Missing entries count as 0 for provisional GPA. This result is incomplete.</p>}
  <div className="table-wrap">
   <table className="hmrs-student-parts-table"><thead><tr><th>Subject</th><th>CQ / Written</th>
    <th>MCQ</th><th>Practical</th><th>Obtained / Full</th><th>Highest</th><th>Grade</th></tr></thead>
    <tbody>{rows.map(row=><React.Fragment key={row.id}>
      <tr><td><strong>{row.name}</strong>{row.optional&&<small className="hmrs-option-label">4th Subject</small>}
       {!row.complete&&<small className="hmrs-entry-missing">Incomplete · missing = 0</small>}
       {row.papers.length>1&&<button type="button" className="hmrs-paper-toggle"
         aria-expanded={!!expanded[row.id]} onClick={()=>setExpanded(old=>({...old,[row.id]:!old[row.id]}))}>
        {expanded[row.id]?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
        {expanded[row.id]?"Hide papers":"View papers"}</button>}</td>
       <td>{score(row.written)}</td><td>{score(row.mcq)}</td><td>{score(row.practical)}</td>
       <td><b>{n(row.obtained)} / {n(row.max)}</b></td>
       <td>{row.highest===null?"—":n(row.highest)}</td><td><b>{row.grade}</b></td></tr>
      {expanded[row.id]&&row.papers.length>1&&<tr className="hmrs-paper-detail-row"><td colSpan={7}>
       <div className="hmrs-paper-detail-grid">{row.papers.map((paper,i)=><div key={paper.title}>
        <b>Paper {i+1}</b><span>{n(paper.obtained)} / {n(paper.max)}</span>
        <small>{paper.parts.map(p=>p.label+": "+n(p.received)+"/"+n(p.max)).join(" · ")}</small>
       </div>)}</div></td></tr>}
     </React.Fragment>)}</tbody>
   </table>
  </div>
 </section>;
}
