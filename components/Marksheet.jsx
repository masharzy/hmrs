"use client";
import {evaluateTranscript} from "../lib/academic";
import {reportPaperRows} from "../lib/report-paper-rows.js";
import {enNumber,enGrade,enStream,enPaper,enPart} from "../lib/result-english.js";
const n=v=>enNumber(v??0);
const gp=v=>Number(v??0).toFixed(2);
export default function Marksheet({student,marks,exam,printId="mark-print",report,metrics}){
 if(!student||!exam)return null;
 const result=report||evaluateTranscript(student,marks||{});
 const papers=reportPaperRows(result,marks||{},metrics);
 return <section id={printId} className="hmrs-mark-report" aria-label={student.name+" detailed marksheet"}>
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
   <thead><tr><th>Subject / Paper</th><th>CQ / MCQ / Practical</th><th>Full</th>
    <th>Obtained</th><th>Highest</th><th>Grade</th><th>GP</th></tr></thead>
   <tbody>{papers.map(row=><tr key={row.id}>
    <td className="hmrs-mark-subject"><strong>{enPaper(row.subjectId,row.paperName)}</strong>
     {row.optional&&<small>4th Subject</small>}{row.legacy&&<small>Legacy combined marks — no paper breakdown</small>}
     {!row.complete&&<small>Missing = 0</small>}</td>
    <td className="hmrs-mark-parts"><div className="hmrs-mark-paper">
     {row.parts.map(part=><span key={part.key}>{enPart(part.label,part.key)}: {n(part.received)}/{n(part.max)}</span>)}
    </div></td>
    <td>{n(row.possible)}</td><td>{n(row.obtained)}</td>
    <td>{row.highest===null||row.highest===undefined?"—":n(row.highest)}</td>
    <td>{row.subjectGrade||"—"}</td><td>{row.subjectPoint===null||row.subjectPoint===undefined?"—":n(row.subjectPoint)}</td>
   </tr>)}</tbody>
  </table>
  <div className="hmrs-mark-totals">
   <div><small>Obtained / Full Marks</small><b>{n(result.total)} / {n(result.maxTotal)}</b></div>
   <div><small>GPA (without 4th)</small><b>{gp(result.withoutFourthGpa)} / 5.00</b></div>
   <div><small>GPA (with 4th)</small><b>{gp(result.withFourthGpa)} / 5.00</b></div>
   <div><small>Result</small><b>{result.letter} {result.passed?"· Pass":"· Fail"}</b></div>
   <div><small>Merit Position (Class / Group)</small><b>{metrics?.rank?n(metrics.rank)+" / "+n(metrics.rankOf):"—"}</b></div>
  </div>
  {!result.complete&&<div className="hmrs-mark-missing">Provisional result — missing marks treated as 0: {result.missingSubjects.join(" · ")}</div>}
  <div className="hmrs-mark-signatures"><span>Class Teacher Signature</span><span>Head Teacher Signature</span></div>
  <p className="hmrs-mark-legal">Computer-generated result. Subject to verification by school authorities.</p>
 </section>;
}
