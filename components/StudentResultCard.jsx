"use client";
import {Printer,AlertTriangle,Check} from "lucide-react";
import {markGroupForReport} from "../lib/result-metrics.js";
import {toBanglaDigits} from "../lib/bangla-numbers";
const bn=v=>toBanglaDigits(v??"—");
export default function StudentResultCard({exam,result,metrics,marks,onPrint}){
 return <section className="panel hmrs-student-result-card" aria-label={exam.name+" এর ফলাফল"}>
  <div className="hmrs-student-result-top">
   <div><h2>{exam.name}</h2><p>শুধু আপনার ব্যক্তিগত ফলাফল · প্রতিটি পত্র ও অংশের নম্বর</p></div>
   <button className="btn sm" type="button" onClick={onPrint}><Printer size={14}/> PDF / প্রিন্ট</button>
  </div>
  <div className="hmrs-mark-totals">
   <div><small>সর্বমোট নম্বর</small><b>{bn(result.total)} / {bn(result.maxTotal)}</b></div>
   <div><small>GPA (৪র্থ বিষয় ছাড়া)</small><b>{bn(result.withoutFourthGpa)}</b></div>
   <div><small>GPA (৪র্থ বিষয়সহ)</small><b>{bn(result.withFourthGpa)}</b></div>
   <div><small>গ্রেড</small><b>{result.letter}</b></div>
   <div><small>মেধাক্রম (শ্রেণি/বিভাগ)</small><b>{metrics?.rank?bn(metrics.rank)+" / "+bn(metrics.rankOf):"—"}</b></div>
  </div>
  {!result.complete&&<p className="hmrs-result-not-ready"><AlertTriangle size={16}/> নম্বর অসম্পূর্ণ: {result.missingSubjects?.join(", ")}</p>}
  <div className="table-wrap">
   <table className="hmrs-student-parts-table"><thead><tr><th>বিষয় / পত্র</th><th>নম্বরের অংশ</th><th>মোট</th><th>সর্বোচ্চ</th><th>গ্রেড</th><th>GP</th></tr></thead>
    <tbody>{result.rows.map(row=><tr key={row.subjectId}>
     <td><b>{row.subject.name}</b>{row.subjectId===result.optionalId&&<span className="hmrs-option-label">৪র্থ বিষয়</span>}</td>
     <td>{markGroupForReport(row.subject).map(group=><div className="hmrs-student-part-group" key={group.title}>
      <strong>{group.title}</strong><span>{group.parts.map(part=>part.label+" "+bn(marks?.[row.subjectId]?.[part.key])+"/"+bn(part.max)).join(" · ")}</span>
     </div>)}</td>
     <td>{bn(row.received)} / {bn(row.subject.max)}</td><td>{bn(metrics?.highest?.[row.subjectId])}</td>
     <td>{row.letter||"—"}</td><td>{bn(row.point)}</td>
    </tr>)}</tbody></table>
  </div>
 </section>;
}
