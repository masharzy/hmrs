"use client";
import {Pencil,Trash2,Plus,FilePenLine,GraduationCap} from "lucide-react";
import {DashboardRouteLink} from "./DashboardShell.jsx";
import {enGrade,enNumber} from "../lib/result-english.js";
const scope=exam=>exam.scopeGrade?enGrade(exam.scopeGrade):"All Classes";
export default function ExamManager({actor,exams,working,onCreate,onEdit,onDelete,onSelect}){
 return <section className="hmrs-exam-manager">
  <div className="hmrs-results-page-head">
   <div><h2>Exams</h2><p>Create and manage exams separately from marks entry.</p></div>
   {(actor.role==="principal"||actor.role==="class_teacher")&&
    <button className="btn primary" type="button" onClick={onCreate} disabled={working}><Plus size={16}/> Create Exam</button>}
  </div>
  {!exams.length?<div className="panel empty">No exams yet. Create your first exam to start adding marks.</div>:
  <div className="hmrs-exam-list">
   {exams.map(exam=><article className="hmrs-exam-list-card panel" key={exam.id}>
     <div className="hmrs-exam-list-icon"><GraduationCap size={20}/></div>
     <div className="hmrs-exam-list-details">
      <h3>{exam.name}</h3><p>{scope(exam)} · {enNumber(exam.year||new Date().getFullYear())}</p>
      <span className={"hmrs-publish-state "+(exam.published?"published":"")}>{exam.published?"Published":"Unpublished"}</span>
     </div>
     <div className="hmrs-exam-list-actions">
      <DashboardRouteLink href="/dashboard/marks" className="btn sm" onNavigate={()=>onSelect(exam.id)}>
       <FilePenLine size={15}/> Marks
      </DashboardRouteLink>
      {(actor.role==="principal"||exam.createdBy===actor.uid)&&
       <button type="button" className="btn sm" disabled={working} onClick={()=>onEdit(exam)}><Pencil size={14}/> Edit</button>}
      {actor.role==="principal"&&<button type="button" className="btn sm danger" disabled={working}
       onClick={()=>onDelete(exam)}><Trash2 size={14}/> Delete</button>}
     </div>
   </article>)}
  </div>}
 </section>;
}
