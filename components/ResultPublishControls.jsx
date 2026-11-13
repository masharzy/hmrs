"use client";
import {useEffect,useState} from "react";
import {AlertTriangle,Check,Eye,EyeOff,Trash2,Users} from "lucide-react";
import {enNumber,enGrade,enStream} from "../lib/result-english.js";
import {examScopeLabel,examStudents} from "../lib/exam-scope.js";
const n=v=>enNumber(v??0);
export default function ResultPublishControls({exams,examId,students,selectedStudent,mode="grid",request,mutate,working,onDelete}){
 const [audit,setAudit]=useState(null),[loading,setLoading]=useState(false);
 const [individualPublished,setIndividualPublished]=useState(null);
 const exam=exams.find(e=>e.id===examId);
 const eligible=exam?examStudents(exam,students):[];
 const selected=eligible.find(s=>s.id===selectedStudent);
 useEffect(()=>{setAudit(null)},[examId]);
 useEffect(()=>{
  let live=true;setIndividualPublished(null);
  if(mode!=="individual"||!examId||!selectedStudent)return()=>{live=false};
  request("result.publication",{params:"examId="+encodeURIComponent(examId)+"&studentId="+encodeURIComponent(selectedStudent)})
   .then(r=>{if(live)setIndividualPublished(r.published===true)})
   .catch(()=>{if(live)setIndividualPublished(null)});
  return()=>{live=false};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[examId,selectedStudent,mode,exam?.published,exam?.publicationVersion]);
 async function loadAudit(){
  const checked=await request("result.audit",{params:"examId="+encodeURIComponent(examId)});
  setAudit(checked.audit);return checked.audit;
 }
 async function publish(all,published){
  if(!exam||loading||working||(!all&&!selected))return;
  setLoading(true);
  try{
   if(published){
    const checked=await loadAudit(),missing=all?checked.incomplete:checked.incomplete.filter(x=>x.studentId===selected.id);
    if(missing.length){
     const names=missing.slice(0,8).map(x=>x.name+" — "+x.missingSubjects.slice(0,3).join(", ")).join("\n");
     if(!window.confirm(n(missing.length)+" student(s) have incomplete marks:\n"+names+
       "\nMissing marks will count as zero. Publish anyway?"))return;
    }else if(!window.confirm(all?"Publish this exam for all eligible students?":"Publish "+selected.name+"'s result?"))return;
   }else if(!window.confirm(all?"Unpublish this exam for all students?":"Hide "+selected.name+"'s result?"))return;
   const args={examId,published,allowIncomplete:true};
   const done=all?await mutate("exam.publish",args):await mutate("result.publish",{...args,studentId:selected.id});
   if(done){setAudit(null);if(!all)setIndividualPublished(published)}
  }catch(e){setAudit({error:e.message,incomplete:[]})}finally{setLoading(false)}
 }
 async function remove(){
  if(!exam||loading||working)return;
  if(!window.confirm("Remove exam '"+exam.name+"' from the website?\n\nExisting marks will be archived for recovery, but students will no longer see this exam."))return;
  setLoading(true);
  try{await onDelete?.(exam.id)}finally{setLoading(false)}
 }
 if(!exam)return <p className="hmrs-publish-empty">Select an exam to manage publication.</p>;
 return <section className="hmrs-publish-panel panel">
  <div className="hmrs-publish-top"><div><h3><Users size={16}/> Publish Results</h3>
   <p>{exam.name} · {examScopeLabel(exam)} · {n(eligible.length)} students</p></div>
   <span className={"hmrs-publish-state "+(exam.published?"published":"")}>{exam.published?"Published by default":"Unpublished"}</span>
  </div>
  <div className="hmrs-publish-controls">
   {exam.published?
    <button type="button" disabled={loading||working} className="btn sm" onClick={()=>publish(true,false)}>
     <EyeOff size={14}/> Unpublish All Results</button>:
    <button type="button" disabled={loading||working||!eligible.length} className="btn primary sm" onClick={()=>publish(true,true)}>
     <Check size={14}/> Publish All Results</button>}
   <button type="button" className="btn sm" disabled={loading||working} onClick={async()=>{
    setLoading(true);try{await loadAudit()}catch(e){setAudit({error:e.message,incomplete:[]})}
    finally{setLoading(false)}
   }}><AlertTriangle size={14}/> Check Missing Marks</button>
   <button type="button" className="btn sm danger" disabled={loading||working} onClick={remove}>
    <Trash2 size={14}/> Remove Exam</button>
  </div>
  {mode==="individual"&&selected&&<div className="hmrs-publish-individual">
   <div><b>{selected.name}</b><span>{enGrade(selected.grade)} {Number(selected.grade)>=9?enStream(selected.group):""} · Roll {n(selected.roll)}</span></div>
   {individualPublished===null?<span className="muted text-xs">Checking publication status...</span>:
    individualPublished?<button type="button" className="btn sm" disabled={loading||working} onClick={()=>publish(false,false)}>
       <EyeOff size={14}/> Hide This Student's Result</button>:
    <button type="button" className="btn sm" disabled={loading||working} onClick={()=>publish(false,true)}>
       <Eye size={14}/> Publish This Student's Result</button>}
  </div>}
  {audit&&<div className="hmrs-publish-audit">
   {audit.error?<p role="alert" className="alert error">{audit.error}</p>:
    <><p>{examScopeLabel(exam)} — Total: {n(audit.total)} · Complete: {n(audit.completeCount)} · Missing: {n(audit.incompleteCount)}</p>
    {!!audit.incompleteCount&&<details open={audit.incompleteCount<=8}><summary>Incomplete student results</summary>
      <div className="hmrs-publish-missing">{audit.incomplete.map(row=>
       <p key={row.studentId}><AlertTriangle size={13}/>{row.name} · {enGrade(row.grade)}
        {Number(row.grade)>=9?" · "+enStream(row.group):""} · Roll {n(row.roll)} — {row.missingSubjects.join(", ")}</p>)}</div>
     </details>}</>}
  </div>}
 </section>;
}
