"use client";
import {useState} from "react";
import {X,Plus,School,Check} from "lucide-react";
import {gradeLabel} from "../lib/bangla-numbers";
const GRADES=[6,7,8,9,10];
export default function ExamCreateModal({actor,working,onClose,onCreate}){
 const [name,setName]=useState("");
 const available=actor.role==="principal"?GRADES:GRADES.filter(n=>(actor.classTeacherClasses||actor.assignedClasses||[]).map(Number).includes(n));
 const [scopeGrade,setScopeGrade]=useState(actor.role==="principal"?"all":String(available[0]||""));
 const [error,setError]=useState("");
 async function submit(event){
  event.preventDefault();setError("");
  if(!name.trim()){setError("পরীক্ষার নাম লিখুন");return}
  if(scopeGrade!=="all"&&!GRADES.includes(Number(scopeGrade))){setError("শ্রেণি নির্বাচন করুন");return}
  const ok=await onCreate({name:name.trim(),scopeGrade});
  if(ok)onClose();
 }
 return <div className="record-modal-backdrop" role="presentation">
  <section className="record-modal hmrs-exam-modal" role="dialog" aria-modal="true" aria-labelledby="hmrs-exam-modal-title">
   <div className="record-modal-head"><div><h2 id="hmrs-exam-modal-title"><School size={19}/> নতুন পরীক্ষা তৈরি</h2>
    <p className="muted text-xs">পরীক্ষার নাম ও কোন শ্রেণির জন্য প্রযোজ্য তা নির্ধারণ করুন</p></div>
    <button className="btn sm" type="button" disabled={working} onClick={onClose} aria-label="বন্ধ করুন"><X size={17}/></button></div>
   <form onSubmit={submit}>
    <div className="record-modal-body">
     {error&&<p className="alert error" role="alert">{error}</p>}
     <label className="field">পরীক্ষার নাম<input value={name} required maxLength={130} autoFocus
      placeholder="যেমন: নির্বাচনী পরীক্ষা ২০২৬" onChange={e=>setName(e.target.value)}/></label>
     <div className="hmrs-exam-scope">
      <h3>কোন শ্রেণির জন্য?</h3>
      <p>সব শ্রেণি অথবা একটি নির্দিষ্ট শ্রেণি নির্বাচন করুন।</p>
      <div className="hmrs-exam-scope-grid">
       {actor.role==="principal"&&<button type="button" aria-pressed={scopeGrade==="all"} className={"hmrs-exam-scope-option "+(scopeGrade==="all"?"selected":"")}
        onClick={()=>setScopeGrade("all")}><span>সব শ্রেণি</span>{scopeGrade==="all"&&<Check size={14}/>}</button>}
       {available.map(g=><button type="button" key={g} aria-pressed={scopeGrade===String(g)}
        className={"hmrs-exam-scope-option "+(scopeGrade===String(g)?"selected":"")} onClick={()=>setScopeGrade(String(g))}>
        <span>{gradeLabel(g)}</span>{scopeGrade===String(g)&&<Check size={14}/>}</button>)}
      </div>
     </div>
     <p className="hmrs-exam-explain">
      {scopeGrade==="all"?"পরীক্ষাটি ৬ষ্ঠ–১০ম শ্রেণির সব শিক্ষার্থীর জন্য থাকবে।":
       gradeLabel(scopeGrade)+"-এর শিক্ষার্থীরাই এই পরীক্ষায় নম্বর পাবে ও ফলাফল দেখবে।"}
     </p>
    </div>
    <div className="record-modal-actions"><button type="button" disabled={working} className="btn" onClick={onClose}>বাতিল</button>
     <button type="submit" disabled={working||!name.trim()||!scopeGrade} className="btn primary"><Plus size={15}/>
      {working?"তৈরি হচ্ছে...":"পরীক্ষা তৈরি করুন"}</button></div>
   </form>
  </section>
 </div>;
}
