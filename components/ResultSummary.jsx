"use client";
import { useEffect, useRef, useState } from "react";
import { Printer, X } from "lucide-react";
import { SUBJECT_GRADES } from "../lib/result-summary.js";

const num=v=>v===null||v===undefined?"—":String(v);
const pct=v=>v===null||v===undefined?"—":v.toFixed(1)+"%";

/** Excel-style result summary for the marks page's current Exam / Class / Group / Subject. */
export default function ResultSummary({exam,grade,group,groupLabel,subjectId,subjectLabel,request,onClose}){
 const [state,setState]=useState({loading:true,error:"",summary:null});
 const closeRef=useRef(null);
 useEffect(()=>{
  let live=true;setState({loading:true,error:"",summary:null});
  const params=new URLSearchParams({examId:exam.id,grade:String(grade||"all"),group:group||"",subjectId:subjectId||""});
  request("result.summary",{params:params.toString()})
   .then(r=>{if(live)setState({loading:false,error:"",summary:r.summary})})
   .catch(e=>{if(live)setState({loading:false,error:e.message,summary:null})});
  return()=>{live=false};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[exam.id,grade,group,subjectId]);
 useEffect(()=>{
  closeRef.current?.focus();
  const key=e=>{if(e.key==="Escape")onClose()};
  window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
 },[onClose]);
 function print(){
  document.body.classList.add("hmrs-print-summary");
  const page=document.createElement("style");
  page.id="hmrs-summary-page";page.textContent="@page{size:landscape;margin:8mm}";
  document.getElementById("hmrs-summary-page")?.remove();document.head.appendChild(page);
  const restore=()=>{document.body.classList.remove("hmrs-print-summary");page.remove();window.removeEventListener("afterprint",restore)};
  window.addEventListener("afterprint",restore);window.print();setTimeout(restore,1500);
 }
 const scope=[exam.name,grade==="all"?"All classes":"Class "+grade,group?groupLabel:"",subjectId?subjectLabel:""].filter(Boolean).join(" · ");
 const s=state.summary;
 // Never dismiss on backdrop mousedown: dragging/clicking its scrollbar would close the modal.
 return <div className="hmrs-summary-backdrop">
  <section className="hmrs-summary" role="dialog" aria-modal="true" aria-label="Result summary">
   <header className="hmrs-summary-head">
    <div><h2>Result Summary</h2><p>{scope}</p></div>
    <button type="button" className="btn sm" onClick={print} disabled={!s}><Printer size={14}/> Print</button>
    <button type="button" className="btn sm" onClick={onClose} ref={closeRef} aria-label="Close summary"><X size={14}/></button>
   </header>
   {state.loading?<p className="hmrs-summary-msg" role="status">Loading…</p>:
    state.error?<p className="alert error" role="alert">{state.error}</p>:
    s.mode==="subject"?<SubjectTable s={s}/>:<Overall s={s}/>}
  </section>
 </div>;
}

function Overall({s}){
 const maxCol=s.columns.map((_,i)=>Math.max(0,...s.subjects.map(x=>x.per[i]||0)));
 const maxFail=Math.max(0,...s.subjects.map(x=>x.fail));
 const cell=(v,cls="")=><td className={cls+(v===0?" zero":"")}>{num(v)}</td>;
 const row=(r,i)=><tr key={r.label+i} className={r.kind}>
  <td className="no">{r.kind==="total"?"Σ":i+1}</td><td className="label">{r.label}</td>
  {cell(r.enrolled)}{cell(r.appeared)}{cell(r.pass)}{cell(r.fail,r.fail?"fail":"")}
  <td>{pct(r.passRate)}</td>{cell(r.gpa5)}{cell(r.gpa4)}{cell(r.gpa3)}</tr>;
 return <>
  <h3>Result</h3>
  <div className="hmrs-summary-scroll"><table className="hmrs-xl">
   <thead><tr><th>#</th><th>Class / Group</th><th>পরীক্ষার্থী</th><th>পরীক্ষা দিয়েছে</th><th>পাস</th><th>ফেল</th>
    <th>পাসের হার</th><th>GPA 5</th><th>GPA 4+</th><th>GPA 3+</th></tr></thead>
   <tbody>{s.rows.map(row)}{s.total&&row(s.total,s.rows.length)}</tbody>
  </table></div>
  <h3>Failed Subjects per Student</h3>
  {s.failGroups?.length?<div className="hmrs-summary-scroll">
   <table className="hmrs-xl hmrs-fail-compact">
    <tbody>{s.failGroups.map(bucket=><tr key={bucket.count}>
     <th scope="row" className="hmrs-fail-category">{bucket.label}<small>{bucket.students.length}</small></th>
     <td className="hmrs-fail-students-cell"><div className="hmrs-fail-cells" role="list" aria-label={bucket.label+" students"}>
      {bucket.students.map(st=><span key={st.id} className="hmrs-fail-cell" role="listitem"
       title={"Class "+st.grade+(st.group?" · "+st.group:"")}>
       <b>{num(st.roll)}</b><span>{st.name}</span>
      </span>)}
     </div></td>
    </tr>)}</tbody>
   </table>
  </div>:<p className="hmrs-summary-note">No failed students in this selection.</p>}
  <h3>Subject-wise Fail</h3>
  <div className="hmrs-summary-scroll"><table className="hmrs-xl">
   <thead><tr><th>#</th><th>Subject</th>{s.columns.map(c=><th key={c}>{c}</th>)}<th>মোট ফেল</th><th>ফেলের হার</th></tr></thead>
   <tbody>{s.subjects.length?s.subjects.map((x,i)=><tr key={x.subjectId}>
    <td className="no">{i+1}</td><td className="label">{x.name}</td>
    {x.per.map((v,j)=>v===null?<td key={j} className="na">—</td>:
     <td key={j} className={v&&v===maxCol[j]?"hi":v?"":"zero"}>{v}</td>)}
    <td className={x.fail&&x.fail===maxFail?"hi":x.fail?"":"zero"}>{x.fail}</td><td>{pct(x.failRate)}</td>
   </tr>):<tr><td className="na" colSpan={s.columns.length+4}>—</td></tr>}</tbody>
  </table></div>
 </>;
}

function SubjectTable({s}){
 const row=(r,i)=><tr key={r.label+i} className={r.kind}>
  <td className="no">{r.kind==="total"?"Σ":i+1}</td><td className="label">{r.label}</td>
  <td>{r.eligible}</td><td className={r.appeared?"":"zero"}>{r.appeared}</td><td className={r.pass?"":"zero"}>{r.pass}</td>
  <td className={r.fail?"fail":"zero"}>{r.fail}</td><td>{pct(r.passRate)}</td>
  {SUBJECT_GRADES.map(g=><td key={g} className={g==="F"&&r.grades[g]?"fail":r.grades[g]?"":"zero"}>{r.grades[g]}</td>)}</tr>;
 return <>
  <h3>{s.subjectName}</h3>
  <div className="hmrs-summary-scroll"><table className="hmrs-xl">
   <thead><tr><th>#</th><th>Class / Group</th><th>মোট শিক্ষার্থী</th><th>পরীক্ষা দিয়েছে</th><th>পাস</th><th>ফেল</th><th>পাসের হার</th>
    {SUBJECT_GRADES.map(g=><th key={g}>{g}</th>)}</tr></thead>
   <tbody>{s.rows.map(row)}{s.total&&row(s.total,s.rows.length)}</tbody>
  </table></div>
 </>;
}
