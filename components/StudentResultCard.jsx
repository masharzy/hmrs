"use client";
import {Printer,AlertTriangle} from "lucide-react";
import {reportPaperRows,paperScoreCells} from "../lib/report-paper-rows.js";
import {enNumber,enPart,enPaper} from "../lib/result-english.js";
const n=v=>enNumber(v??0);
const g=v=>Number(v??0).toFixed(2);
export default function StudentResultCard({exam,result,metrics,marks,onPrint,isAdmin=false}){
 const papers=reportPaperRows(result,marks||{},metrics);
 return <section className="panel hmrs-student-result-card" aria-label={exam.name+" result"}>
  <div className="hmrs-student-result-top">
   <div><h2>{exam.name}</h2><p>{isAdmin?"Selected student's result":"Your personal result"} · Paper, CQ, MCQ and practical breakdown</p></div>
   <button className="btn sm" type="button" onClick={onPrint}><Printer size={14}/> Save PDF / Print</button>
  </div>
  <div className="hmrs-mark-totals">
   <div><small>Obtained / Full Marks</small><b>{n(result.total)} / {n(result.maxTotal)}</b></div>
   <div><small>GPA (without 4th)</small><b>{g(result.withoutFourthGpa)}</b></div>
   <div><small>GPA (with 4th)</small><b>{g(result.withFourthGpa)}</b></div>
   <div><small>Grade</small><b>{result.letter}</b></div>
   <div><small>Position (Class / Group)</small><b>{metrics?.rank?n(metrics.rank)+" / "+n(metrics.rankOf):"Not ranked"}</b></div>
  </div>
  {!result.complete&&<p className="hmrs-result-not-ready"><AlertTriangle size={16}/>
    Missing entries count as 0 for GPA. This is an incomplete, provisional result: {result.missingSubjects?.join(", ")}</p>}
  <div className="table-wrap">
   <table className="hmrs-student-parts-table"><thead><tr><th>Subject / Paper</th><th>CQ / Written</th><th>MCQ</th>
     <th>Practical</th><th>Obtained / Full</th><th>Highest</th><th>Grade</th><th>GP</th></tr></thead>
    <tbody>{papers.map(row=><tr key={row.id}>
     <td><b>{enPaper(row.subjectId,row.paperName)}</b>{row.optional&&<span className="hmrs-option-label">4th Subject</span>}
      {row.legacy&&<span className="hmrs-option-label">Legacy combined marks — no paper breakdown</span>}
      {!row.complete&&<small className="hmrs-entry-missing">Missing cells = 0</small>}</td>
     {["written","mcq","practical"].map(key=>{
       const part=paperScoreCells(row)[key];
       return <td key={key} className="hmrs-result-mark-cell">{part?n(part.received)+"/"+n(part.max):"—"}</td>;
      })}
     <td><b>{n(row.obtained)} / {n(row.possible)}</b></td><td>{n(row.highest)}</td>
     <td>{row.subjectGrade||"—"}</td><td>{row.subjectPoint===null||row.subjectPoint===undefined?"—":n(row.subjectPoint)}</td>
    </tr>)}</tbody></table>
  </div>
 </section>;
}
