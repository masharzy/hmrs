"use client";
import {evaluateTranscript} from "../lib/academic";
import {markGroupForReport} from "../lib/result-metrics.js";
import {toBanglaDigits,gradeLabel} from "../lib/bangla-numbers";
const n=value=>toBanglaDigits(value??"—");
const groupName={science:"বিজ্ঞান",business:"ব্যবসায় শিক্ষা",humanities:"মানবিক"};
export default function Marksheet({student,marks,exam,printId="mark-print",report,metrics}){
 if(!student||!exam)return null;
 const result=report||evaluateTranscript(student,marks||{});
 const scores=marks||{};
 return <section id={printId} className="hmrs-mark-report" aria-label={student.name+" এর নম্বরপত্র"}>
  <div className="hmrs-mark-report-header">
   <div className="hmrs-mark-school">হাজী মতিউর রহমান সরকার উচ্চ বিদ্যালয়</div>
   <div className="hmrs-mark-address">পঞ্চবটি, বৈদ্যেরবাজার, সোনারগাঁ, নারায়ণগঞ্জ · EIIN: 112359</div>
   <h2>{exam.name} — বিস্তারিত নম্বরপত্র</h2>
  </div>
  <div className="hmrs-mark-student-grid">
   <div><b>শিক্ষার্থী</b><span>{student.name}</span></div>
   <div><b>রোল</b><span>{n(student.roll)}</span></div>
   <div><b>শ্রেণি</b><span>{gradeLabel(student.grade)}</span></div>
   {Number(student.grade)>=9&&<div><b>বিভাগ</b><span>{groupName[student.group]||"—"}</span></div>}
   <div><b>পিতার নাম</b><span>{student.fatherName||"—"}</span></div>
   <div><b>মাতার নাম</b><span>{student.motherName||"—"}</span></div>
  </div>
  <table className="hmrs-mark-table">
   <thead><tr><th>বিষয় / পত্র</th><th>CQ / MCQ / ব্যবহারিক</th><th>পূর্ণ নম্বর</th>
    <th>প্রাপ্ত</th><th>সর্বোচ্চ</th><th>গ্রেড</th><th>GP</th></tr></thead>
   <tbody>{result.rows.map(row=><tr key={row.subjectId}>
    <td className="hmrs-mark-subject"><strong>{row.subject.name}</strong>{row.subjectId===result.optionalId&&<small>৪র্থ বিষয়</small>}</td>
    <td className="hmrs-mark-parts">{markGroupForReport(row.subject).map(group=>
     <div key={group.title} className="hmrs-mark-paper"><b>{group.title}</b>
      {group.parts.map(part=><span key={part.key}>{part.label}: {n(scores[row.subjectId]?.[part.key])}/{n(part.max)}</span>)}
     </div>)}</td>
    <td>{n(row.subject.max)}</td><td>{row.status==="complete"?n(row.received):"—"}</td>
    <td>{n(metrics?.highest?.[row.subjectId])}</td><td>{row.letter||"—"}</td><td>{n(row.point)}</td>
   </tr>)}</tbody>
  </table>
  <div className="hmrs-mark-totals">
   <div><small>মোট প্রাপ্ত / পূর্ণ</small><b>{n(result.total)} / {n(result.maxTotal)}</b></div>
   <div><small>GPA (৪র্থ ছাড়া)</small><b>{n(result.withoutFourthGpa)} / ৫.০০</b></div>
   <div><small>GPA (৪র্থসহ)</small><b>{n(result.withFourthGpa)} / ৫.০০</b></div>
   <div><small>ফলাফল</small><b>{result.letter} {result.complete?(result.passed?"· উত্তীর্ণ":"· অনুত্তীর্ণ"):"· অসম্পূর্ণ"}</b></div>
   <div><small>মেধাক্রম (শ্রেণি/বিভাগ)</small><b>{metrics?.rank?n(metrics.rank)+" / "+n(metrics.rankOf):"—"}</b></div>
  </div>
  {!result.complete&&<div className="hmrs-mark-missing">নম্বর অসম্পূর্ণ: {result.missingSubjects.join(" · ")}</div>}
  <div className="hmrs-mark-signatures"><span>শ্রেণি শিক্ষকের স্বাক্ষর</span><span>প্রধান শিক্ষকের স্বাক্ষর</span></div>
  <p className="hmrs-mark-legal">কম্পিউটার প্রস্তুতকৃত ফলাফল। বিদ্যালয় কর্তৃপক্ষের যাচাই ও স্বাক্ষর সাপেক্ষে প্রযোজ্য।</p>
 </section>;
}
