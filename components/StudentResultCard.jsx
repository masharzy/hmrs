"use client";
import {Printer,AlertTriangle} from "lucide-react";
import {reportPaperRows} from "../lib/report-paper-rows.js";
import {toBanglaDigits} from "../lib/bangla-numbers";
const bn=v=>toBanglaDigits(v??"—");
export default function StudentResultCard({exam,result,metrics,marks,onPrint,isAdmin=false}){
 const papers=reportPaperRows(result,marks||{},metrics);
 return <section className="panel hmrs-student-result-card" aria-label={exam.name+" এর ফলাফল"}>
  <div className="hmrs-student-result-top">
   <div><h2>{exam.name}</h2><p>{isAdmin?"নির্বাচিত শিক্ষার্থীর ফলাফল":"শুধু আপনার ব্যক্তিগত ফলাফল"} · পৃথক পত্র, CQ, MCQ ও ব্যবহারিক নম্বর</p></div>
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
   <table className="hmrs-student-parts-table"><thead><tr><th>বিষয় / পত্র</th><th>নম্বরের অংশ</th><th>প্রাপ্ত / পূর্ণ</th><th>সর্বোচ্চ</th><th>গ্রেড</th><th>GP</th></tr></thead>
    <tbody>{papers.map(row=><tr key={row.id}>
     <td><b>{row.paperName}</b>{row.optional&&<span className="hmrs-option-label">৪র্থ বিষয়</span>}
      {row.legacy&&<span className="hmrs-option-label">পুরোনো একত্রিত নম্বর; পত্রভিত্তিক তথ্য নেই</span>}</td>
     <td><div className="hmrs-student-part-group"><span>{row.parts.map(part=>part.label+" "+bn(part.received)+"/"+bn(part.max)).join(" · ")}</span></div></td>
     <td><b>{bn(row.obtained)} / {bn(row.possible)}</b></td><td>{bn(row.highest)}</td>
     <td>{row.subjectGrade||"—"}</td><td>{bn(row.subjectPoint)}</td>
    </tr>)}</tbody></table>
  </div>
 </section>;
}
