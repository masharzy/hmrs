"use client";
import { evaluateTranscript } from "../lib/academic";
import { toBanglaDigits, gradeLabel } from "../lib/bangla-numbers";
export default function Marksheet({student,marks,exam,printId="mark-print",report}){
 if(!student||!exam)return null;
 const result=report||evaluateTranscript(student,marks||{});
 return <div id={printId}>
  <div style={{textAlign:"center",paddingBottom:16,borderBottom:"2px solid #234"}}>
   <h2 style={{fontSize:21,fontWeight:800,margin:0}}>হাজী মতিউর রহমান সরকার উচ্চ বিদ্যালয়</h2>
   <p style={{fontSize:12,margin:"5px 0"}}>পঞ্চবটি, বৈদ্যেরবাজার, সোনারগাঁ, নারায়ণগঞ্জ | EIIN: 112359</p>
   <h3 style={{margin:"12px 0 2px",fontWeight:800}}>{exam.name} — নম্বরপত্র</h3>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,margin:"20px 0",fontSize:12}}>
   <div><b>নাম:</b> {student.name}</div><div><b>রোল:</b> {toBanglaDigits(student.roll)}</div>
   <div><b>শ্রেণি:</b> {gradeLabel(student.grade)}</div><div><b>শাখা:</b> {student.section?.toUpperCase()}</div>
  </div>
  <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th>বিষয়</th><th>পূর্ণ নম্বর</th><th>প্রাপ্ত নম্বর</th><th>গ্রেড</th><th>ফলাফল</th></tr></thead>
   <tbody>{result.rows.map(r=><tr key={r.subjectId}><td>{r.subject.name}{r.subjectId===result.optionalId?" (৪র্থ বিষয়)":""}</td>
    <td>{toBanglaDigits(r.subject.max)}</td><td>{toBanglaDigits(r.status==="complete"?r.received:"—")}</td><td>{r.status==="complete"?r.letter:"—"}</td>
    <td>{r.status==="complete"?(r.passed?"পাস":"ফেল"):"অসম্পূর্ণ"}</td></tr>)}</tbody>
  </table>
  <div style={{marginTop:18,display:"flex",justifyContent:"space-between",fontWeight:800}}>
   <span>সামগ্রিক ফলাফল: {result.complete?(result.passed?"উত্তীর্ণ":"অনুত্তীর্ণ"):"অসম্পূর্ণ"}</span><span>GPA: {toBanglaDigits(result.gpa??"—")} ({result.letter})</span>
  </div>
  <div style={{marginTop:85,display:"flex",justifyContent:"space-between",fontSize:12}}><span>শ্রেণি শিক্ষকের স্বাক্ষর</span><span>প্রধান শিক্ষকের স্বাক্ষর</span></div>
  <p style={{marginTop:26,fontSize:9,color:"#777"}}>কম্পিউটার প্রস্তুতকৃত নম্বরপত্র। চূড়ান্ত স্বাক্ষর ও যাচাই ছাড়া প্রাতিষ্ঠানিক সনদ নয়।</p>
 </div>;
}