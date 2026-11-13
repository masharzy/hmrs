"use client";
import {useState} from "react";
import {X,Plus,School,Check} from "lucide-react";
import {enGrade} from "../lib/result-english.js";
const GRADES=[6,7,8,9,10];
export default function ExamCreateModal({actor,working,onClose,onCreate,exam=null}){
 const [name,setName]=useState(exam?.name||"");
 const available=actor.role==="principal"?GRADES:GRADES.filter(n=>(actor.classTeacherClasses||actor.assignedClasses||[]).map(Number).includes(n));
 const [scopeGrade,setScopeGrade]=useState(exam?(exam.scopeGrade?String(exam.scopeGrade):"all"):(actor.role==="principal"?"all":String(available[0]||"")));
 const [error,setError]=useState("");
 async function submit(event){
  event.preventDefault();setError("");
  if(!name.trim()){setError("Enter an exam name");return}
  if(scopeGrade!=="all"&&!GRADES.includes(Number(scopeGrade))){setError("Select a class");return}
  const ok=await onCreate({name:name.trim(),scopeGrade,examId:exam?.id||null});
  if(ok)onClose();
 }
 return <div className="record-modal-backdrop" role="presentation">
  <section className="record-modal hmrs-exam-modal" role="dialog" aria-modal="true" aria-labelledby="hmrs-exam-modal-title">
   <div className="record-modal-head"><div><h2 id="hmrs-exam-modal-title"><School size={19}/> {exam?"Edit Exam":"Create Exam"}</h2>
    <p className="muted text-xs">Choose the exam name and eligible classes.</p></div>
    <button className="btn sm" type="button" disabled={working} onClick={onClose} aria-label="Close"><X size={17}/></button></div>
   <form onSubmit={submit}>
    <div className="record-modal-body">
     {error&&<p className="alert error" role="alert">{error}</p>}
     <label className="field">Exam Name<input value={name} required maxLength={130} autoFocus
      placeholder="Example: Annual Examination 2026" onChange={e=>setName(e.target.value)}/></label>
     <div className="hmrs-exam-scope">
      <h3>Eligible Classes</h3>
      <p>Choose all classes or one class.</p>
      <div className="hmrs-exam-scope-grid">
       {actor.role==="principal"&&<button type="button" aria-pressed={scopeGrade==="all"} className={"hmrs-exam-scope-option "+(scopeGrade==="all"?"selected":"")}
        onClick={()=>setScopeGrade("all")}><span>All Classes</span>{scopeGrade==="all"&&<Check size={14}/>}</button>}
       {available.map(g=><button type="button" key={g} aria-pressed={scopeGrade===String(g)}
        className={"hmrs-exam-scope-option "+(scopeGrade===String(g)?"selected":"")} onClick={()=>setScopeGrade(String(g))}>
        <span>{enGrade(g)}</span>{scopeGrade===String(g)&&<Check size={14}/>}</button>)}
      </div>
     </div>
     <p className="hmrs-exam-explain">
      {scopeGrade==="all"?"This exam is available for Classes 6–10.":
       "Only "+enGrade(scopeGrade)+" students can receive marks for this exam."}
     </p>
    </div>
    <div className="record-modal-actions"><button type="button" disabled={working} className="btn" onClick={onClose}>Cancel</button>
     <button type="submit" disabled={working||!name.trim()||!scopeGrade} className="btn primary"><Plus size={15}/>
      {working?"Saving...":exam?"Save Changes":"Create Exam"}</button></div>
   </form>
  </section>
 </div>;
}
