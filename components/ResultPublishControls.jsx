"use client";
import {useState} from "react";
import {AlertTriangle,Check,Eye,EyeOff} from "lucide-react";
import {gradeLabel,toBanglaDigits} from "../lib/bangla-numbers";
import {groupNames} from "../lib/student-admin";
const n=v=>toBanglaDigits(v??0);
export default function ResultPublishControls({exams,examId,students,request,mutate,working}){
 const [studentId,setStudentId]=useState(""),[audit,setAudit]=useState(null),[loading,setLoading]=useState(false);
 const exam=exams.find(e=>e.id===examId);
 const sorted=[...students].sort((a,b)=>Number(a.grade)-Number(b.grade)||String(a.group||"").localeCompare(String(b.group||""))||Number(a.roll)-Number(b.roll));
 async function publish(all,published){
  if(!examId||loading||working)return;
  if(!all&&!studentId)return;
  setLoading(true);
  try{
   if(published){
    const checked=await request("result.audit",{params:"examId="+encodeURIComponent(examId)});
    setAudit(checked.audit);
    const missing=all?checked.audit.incomplete:checked.audit.incomplete.filter(x=>x.studentId===studentId);
    if(missing.length){
     const names=missing.slice(0,8).map(x=>x.name+" — "+x.missingSubjects.slice(0,3).join(", ")).join("\n");
     if(!window.confirm(n(missing.length)+" জনের নম্বর অসম্পূর্ণ।\n"+names+
      (missing.length>8?"\nআরও "+n(missing.length-8)+" জন":"")+
      "\n\nঅসম্পূর্ণ ফলাফল প্রকাশ করবেন?"))return;
    }else if(!window.confirm(all?"সব শিক্ষার্থীর ফলাফল প্রকাশ করবেন?":"নির্বাচিত শিক্ষার্থীর ফলাফল প্রকাশ করবেন?"))return;
   }else if(!window.confirm(all?"সবার ফলাফল অপ্রকাশিত করবেন?":"এই শিক্ষার্থীর ফলাফল অপ্রকাশিত করবেন?"))return;
   const args={examId,published,allowIncomplete:true};
   const done=all?await mutate("exam.publish",args):await mutate("result.publish",{...args,studentId});
   if(done&&published)setAudit(null);
  }catch(e){setAudit({error:e.message,incomplete:[]})}
  finally{setLoading(false)}
 }
 if(!exam)return null;
 return <section className="hmrs-publish-panel panel">
  <div className="hmrs-publish-top"><div><h3>ফলাফল প্রকাশ</h3>
   <p>একজন শিক্ষার্থী অথবা সবাইকে প্রকাশ করুন। অসম্পূর্ণ নম্বর থাকলে আগে সতর্কবার্তা দেখা যাবে।</p></div></div>
  <div className="hmrs-publish-controls">
   <label className="field"><span>নির্দিষ্ট শিক্ষার্থী</span><select value={studentId} onChange={e=>{setStudentId(e.target.value);setAudit(null)}}>
    <option value="">শিক্ষার্থী নির্বাচন করুন</option>
    {sorted.map(s=><option key={s.id} value={s.id}>{s.name} · {gradeLabel(s.grade)} {Number(s.grade)>=9?(groupNames[s.group]||""):""} · রোল {n(s.roll)}</option>)}
   </select></label>
   <button type="button" disabled={!studentId||loading||working} className="btn sm primary" onClick={()=>publish(false,true)}><Eye size={14}/> একজনের ফল প্রকাশ</button>
   <button type="button" disabled={!studentId||loading||working} className="btn sm" onClick={()=>publish(false,false)}><EyeOff size={14}/> একজনের ফল লুকান</button>
   <button type="button" disabled={loading||working} className="btn sm primary" onClick={()=>publish(true,true)}><Check size={14}/> সবার ফল একসঙ্গে প্রকাশ</button>
   <button type="button" disabled={loading||working} className="btn sm" onClick={()=>publish(true,false)}>সবার ফল অপ্রকাশ</button>
  </div>
  <div className="hmrs-publish-controls"><button type="button" className="btn sm" disabled={loading||working} onClick={async()=>{
   setLoading(true);try{const checked=await request("result.audit",{params:"examId="+encodeURIComponent(examId)});setAudit(checked.audit)}
   catch(e){setAudit({error:e.message,incomplete:[]})}finally{setLoading(false)}
  }}><AlertTriangle size={14}/> অসম্পূর্ণ ফলাফল দেখুন</button></div>
  {audit&&<div className="hmrs-publish-audit">
   {audit.error?<p className="alert error">{audit.error}</p>:
    <><p>মোট {n(audit.total)} জন · সম্পূর্ণ {n(audit.completeCount)} জন · নম্বর বাকি {n(audit.incompleteCount)} জন</p>
    {!!audit.incompleteCount&&<details open={audit.incompleteCount<=10}><summary>যাদের নম্বর সেট করা হয়নি</summary>
      <div className="hmrs-publish-missing">{audit.incomplete.slice(0,100).map(row=>
       <p key={row.studentId}><AlertTriangle size={13}/>{row.name} · {gradeLabel(row.grade)}
        {Number(row.grade)>=9?" · "+(groupNames[row.group]||""):""} · রোল {n(row.roll)} — {row.missingSubjects.join(", ")}</p>)}</div>
     </details>}</>}
  </div>}
 </section>;
}
