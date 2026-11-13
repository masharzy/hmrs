"use client";
import {evaluateTranscript} from "../lib/academic";
import {reportSubjectRows} from "../lib/report-subject-rows.js";
import {enNumber,enGrade,enStream} from "../lib/result-english.js";
const n=v=>enNumber(v??0),gp=v=>Number(v??0).toFixed(2);
const score=x=>x.max?n(x.obtained)+"/"+n(x.max):"—";
export default function Marksheet({student,marks,exam,printId="mark-print",report,metrics}){
 if(!student||!exam)return null;
 const result=report||evaluateTranscript(student,marks||{});
 const rows=reportSubjectRows(result,marks||{},metrics);
 return <section id={printId} className="hmrs-mark-report" aria-label={student.name+" marksheet"}>
  <div className="hmrs-mark-report-header">
   <div className="hmrs-mark-school">Haji Matiur Rahman Sarkar High School</div>
   <div className="hmrs-mark-address">Sonargaon, Narayanganj · EIIN: 112359</div>
   <h2>{exam.name} — Individual Marksheet</h2>
  </div>
  <div className="hmrs-mark-student-grid">
   <div><b>Student</b><span>{student.name}</span></div>
   <div><b>Roll</b><span>{n(student.roll)}</span></div>
   <div><b>Class</b><span>{enGrade(student.grade)}</span></div>
   {Number(student.grade)>=9&&<div><b>Group</b><span>{enStream(student.group)}</span></div>}
   <div><b>Father's Name</b><span>{student.fatherName||"—"}</span></div>
   <div><b>Mother's Name</b><span>{student.motherName||"—"}</span></div>
  </div>
  <table className="hmrs-mark-table">
   <thead><tr><th>Subject</th><th>CQ / Written</th><th>MCQ</th><th>Practical</th>
    <th>Obtained / Full</th><th>Highest</th><th>Grade</th></tr></thead>
   <tbody>{rows.map(row=><tr key={row.id}>
    <td className="hmrs-mark-subject"><strong>{row.name}</strong>
     {row.optional&&<small>4th Subject</small>}{!row.complete&&<small>Incomplete (missing = 0)</small>}</td>
    <td>{score(row.written)}</td><td>{score(row.mcq)}</td><td>{score(row.practical)}</td>
    <td>{n(row.obtained)} / {n(row.max)}</td>
    <td>{row.highest===null?"—":n(row.highest)}</td><td>{row.grade}</td>
   </tr>)}</tbody>
  </table>
  <div className="hmrs-mark-totals">
   <div><small>Obtained / Full Marks</small><b>{n(rows.reduce((t,r)=>t+r.obtained,0))} / {n(result.maxTotal)}</b></div>
   <div><small>GPA (without 4th)</small><b>{gp(result.withoutFourthGpa)} / 5.00</b></div>
   <div><small>GPA (with 4th)</small><b>{gp(result.withFourthGpa)} / 5.00</b></div>
   <div><small>Result</small><b>{result.letter} {result.passed?"· Pass":"· Fail"}</b></div>
   <div><small>Merit Position (Class / Group)</small><b>{metrics?.rank?n(metrics.rank)+" / "+n(metrics.rankOf):"—"}</b></div>
  </div>
  {!result.complete&&<div className="hmrs-mark-missing">Provisional — missing marks are calculated as zero.</div>}
  <div className="hmrs-mark-signatures"><span>Class Teacher Signature</span><span>Head Teacher Signature</span></div>
  <p className="hmrs-mark-legal">Computer-generated result. Subject to verification by school authorities.</p>
 </section>;
}
