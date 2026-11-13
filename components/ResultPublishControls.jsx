"use client";
import {useEffect,useState} from "react";
import {AlertTriangle,Check,Eye,EyeOff,Users} from "lucide-react";
import {gradeLabel,toBanglaDigits} from "../lib/bangla-numbers";
import {groupNames} from "../lib/student-admin";
import {examScopeLabel,examStudents} from "../lib/exam-scope.js";
const n=v=>toBanglaDigits(v??0);
export default function ResultPublishControls({exams,examId,students,selectedStudent,mode="grid",request,mutate,working}){
 const [audit,setAudit]=useState(null),[loading,setLoading]=useState(false);
 const exam=exams.find(e=>e.id===examId);
 const eligible=exam?examStudents(exam,students):[];
 const selected=eligible.find(s=>s.id===selectedStudent);
 useEffect(()=>{setAudit(null)},[examId]);
 async function loadAudit(){
  const checked=await request("result.audit",{params:"examId="+encodeURIComponent(examId)});
  setAudit(checked.audit);
  return checked.audit;
 }
 async function publish(all,published){
  if(!exam||loading||working||(!all&&!selected))return;
  setLoading(true);
  try{
   if(published){
    const checked=await loadAudit();
    const missing=all?checked.incomplete:checked.incomplete.filter(x=>x.studentId===selected.id);
    if(missing.length){
     const names=missing.slice(0,8).map(x=>x.name+" — "+x.missingSubjects.slice(0,3).join(", ")).join("\n");
     if(!window.confirm(n(missing.length)+" জনের নম্বর অসম্পূর্ণ।\n"+names+
      (missing.length>8?"\nআরও "+n(missing.length-8)+" জন":"")+
      "\n\nএই অসম্পূর্ণ ফলাফলও প্রকাশ করবেন?"))return;
    }else if(!window.confirm(all?examScopeLabel(exam)+"-এর সব শিক্ষার্থীর ফলাফল প্রকাশ করবেন?":
       selected.name+"-এর ফলাফল প্রকাশ করবেন?"))return;
   }else if(!window.confirm(all?examScopeLabel(exam)+"-এর সব ফলাফল অপ্রকাশিত করবেন?":
      selected.name+"-এর ফলাফল অপ্রকাশিত করবেন?"))return;
   const args={examId,published,allowIncomplete:true};
   const done=all?await mutate("exam.publish",args):await mutate("result.publish",{...args,studentId:selected.id});
   if(done)setAudit(null);
  }catch(e){setAudit({error:e.message,incomplete:[]})}
  finally{setLoading(false)}
 }
 if(!exam)return <p className="hmrs-publish-empty">ফলাফল প্রকাশের জন্য পরীক্ষা নির্বাচন করুন।</p>;
 return <section className="hmrs-publish-panel panel">
  <div className="hmrs-publish-top"><div><h3><Users size={16}/> ফলাফল প্রকাশের নিয়ন্ত্রণ</h3>
   <p>{exam.name} · {examScopeLabel(exam)} · {n(eligible.length)} জন শিক্ষার্থী</p></div>
   <span className={"hmrs-publish-state "+(exam.published?"published":"")}>{exam.published?"সবার জন্য প্রকাশিত":"সবার জন্য অপ্রকাশিত"}</span>
  </div>
  <div className="hmrs-publish-controls">
   <button type="button" disabled={loading||working||!eligible.length} className="btn primary sm" onClick={()=>publish(true,true)}>
    <Check size={14}/> এই পরীক্ষার সবার ফল প্রকাশ করুন</button>
   <button type="button" disabled={loading||working} className="btn sm" onClick={()=>publish(true,false)}>
    <EyeOff size={14}/> সবার ফল অপ্রকাশ করুন</button>
   <button type="button" className="btn sm" disabled={loading||working} onClick={async()=>{
    setLoading(true);try{await loadAudit()}catch(e){setAudit({error:e.message,incomplete:[]})}
    finally{setLoading(false)}
   }}><AlertTriangle size={14}/> অসম্পূর্ণ নম্বর যাচাই</button>
  </div>
  {mode==="individual"&&selected&&<div className="hmrs-publish-individual">
   <div><b>{selected.name}</b><span>{gradeLabel(selected.grade)} {Number(selected.grade)>=9?groupNames[selected.group]||"":""} · রোল {n(selected.roll)}</span></div>
   <button type="button" className="btn sm" disabled={loading||working} onClick={()=>publish(false,true)}><Eye size={14}/> শুধু এই শিক্ষার্থীর ফল প্রকাশ</button>
   <button type="button" className="btn sm" disabled={loading||working} onClick={()=>publish(false,false)}><EyeOff size={14}/> এই শিক্ষার্থীর ফল লুকান</button>
  </div>}
  {audit&&<div className="hmrs-publish-audit">
   {audit.error?<p role="alert" className="alert error">{audit.error}</p>:
    <><p>{examScopeLabel(exam)} — মোট {n(audit.total)} জন · সম্পূর্ণ {n(audit.completeCount)} জন · নম্বর বাকি {n(audit.incompleteCount)} জন</p>
    {!!audit.incompleteCount&&<details open={audit.incompleteCount<=8}><summary>যাদের ফলাফল অসম্পূর্ণ</summary>
      <div className="hmrs-publish-missing">{audit.incomplete.map(row=>
       <p key={row.studentId}><AlertTriangle size={13}/>{row.name} · {gradeLabel(row.grade)}
        {Number(row.grade)>=9?" · "+(groupNames[row.group]||""):""} · রোল {n(row.roll)} — {row.missingSubjects.join(", ")}</p>)}</div>
     </details>}</>}
  </div>}
 </section>;
}
