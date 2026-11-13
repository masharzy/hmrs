"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { getStudentSubjects } from "../lib/academic";
import {examScopeGrade,examAppliesToStudent,examScopeLabel} from "../lib/exam-scope.js";
import { allowedSubjects } from "../lib/staff-permissions.js";
import { toAsciiDigits } from "../lib/bangla-numbers";
import {enGrade,enStream,enNumber,enPaper,enPart,enSubject} from "../lib/result-english.js";
import {pendingMarkBatch,clearSavedMarkEdits} from "../lib/marks-autosave.js";

const grades=[6,7,8,9,10],groupOptions=[["","All groups"],["science","Science"],["business","Business Studies"],["humanities","Humanities"]];
const keyFor=(studentId,subjectId)=>studentId+"|"+subjectId;
const getList=student=>{try{return getStudentSubjects(student)}catch{return []}};
const sortStudents=(a,b)=>Number(a.roll)-Number(b.roll)||String(a.name).localeCompare(String(b.name),"bn");
// Present papers as separate Excel column groups; retain one subject ID in Firestore/GPA.
function displayGroups(specs){
 const map=new Map();
 for(const subjects of specs.values())for(const subject of subjects){
  for(const part of subject.parts){
   const paper=part.paper||(part.key==="first"?"১ম পত্র":part.key==="second"?"২য় পত্র":"");
   const name=paper?enPaper(subject.id,paper):enSubject(subject.id,subject.name);
   const id=subject.id+"::"+(paper||"all");
   if(!map.has(id))map.set(id,{id,subjectId:subject.id,name,parts:new Map()});
   const shortLabel=enPart(part.label,part.key);
   map.get(id).parts.set(part.key,{...part,label:shortLabel});
  }
 }
 return [...map.values()].map(group=>({...group,parts:[...group.parts.values()]}));
}
export default function ResultEntryGrid({exams,examId,onExamChange,students,actor,request,mutate,working}){
 const [grade,setGrade]=useState("6"),[group,setGroup]=useState(""),[subjectId,setSubjectId]=useState("");
 const [sheet,setSheet]=useState([]),[edits,setEdits]=useState({});
 const [loading,setLoading]=useState(false),[sending,setSending]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState("");
 const [attempt,setAttempt]=useState(0);
 const savingRef=useRef(false),tableRef=useRef(null);
 const exam=exams.find(e=>e.id===examId);
 const scopedGrade=examScopeGrade(exam);
 useEffect(()=>{if(scopedGrade&&Number(grade)!==scopedGrade){setGrade(String(scopedGrade));setGroup("");}},[scopedGrade,grade]);
 const rows=useMemo(()=>students.filter(s=>examAppliesToStudent(exam,s)&&Number(s.grade)===Number(grade)&&(!group||s.group===group)).sort(sortStudents),[students,grade,group,exam]);
 const subjectsByStudent=useMemo(()=>new Map(rows.map(s=>[s.id,allowedSubjects(actor,s)])),[rows,actor]);
 const groups=useMemo(()=>displayGroups(subjectsByStudent),[subjectsByStudent]);
 const displayed=subjectId?groups.filter(s=>s.id===subjectId):groups;
 const byKey=useMemo(()=>new Map(sheet.map(m=>[keyFor(m.studentId,m.subjectId),m.scores||{}])),[sheet]);
 useEffect(()=>{setSubjectId("");setEdits({});setError("");setSaved("")},[grade,group,examId]);
 useEffect(()=>{
  let live=true;setSheet([]);setLoading(!!examId);setError("");setSaved("");
  if(!examId){setLoading(false);return;}
  request("marks",{params:"examId="+encodeURIComponent(examId)+"&grade="+encodeURIComponent(grade)})
   .then(result=>{if(live)setSheet(result.items||[])})
   .catch(e=>{if(live)setError(e.message)})
   .finally(()=>{if(live)setLoading(false)});
  return ()=>{live=false};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[examId,grade]);
 const entries=useMemo(()=>Object.entries(edits).map(([key,scores])=>{
  const i=key.indexOf("|");return {studentId:key.slice(0,i),subjectId:key.slice(i+1),scores};
 }),[edits]);
 const locked=!!exam?.published&&actor?.role!=="principal";
 const changeGuard=()=>!savingRef.current&&(!entries.length||window.confirm("Some marks are still pending auto-save. Discard them and switch?"));
 function scoreFor(student,subject,part){
  const key=keyFor(student.id,subject.subjectId);
  return edits[key]?.[part.key]??byKey.get(key)?.[part.key]??"";
 }
 function put(student,subject,part,value){
  const key=keyFor(student.id,subject.subjectId);
  setEdits(old=>({...old,[key]:{...old[key],[part.key]:toAsciiDigits(value)}}));
  setError("");setSaved("");
 }
 function printCompactSheet(){
  if(!rows.length||!examId||loading)return;
  if((entries.length||savingRef.current)&&!window.confirm("Some recent changes have not finished auto-saving. Continue printing?"))return;
  document.body.classList.add("hmrs-print-sheet");
  const restore=()=>{document.body.classList.remove("hmrs-print-sheet");window.removeEventListener("afterprint",restore)};
  window.addEventListener("afterprint",restore);
  requestAnimationFrame(()=>requestAnimationFrame(()=>window.print()));
 }
 function moveCell(event,row,col){
  if(!["Enter","ArrowDown","ArrowUp"].includes(event.key))return;
  if(event.key==="Enter"||event.key==="ArrowDown")row++;
  else row--;
  const input=tableRef.current?.querySelector('input[data-sheet-row="'+row+'"][data-sheet-col="'+col+'"]');
  if(input){event.preventDefault();input.focus();input.select()}
 }
 async function save(){
  if(!examId||loading||working||locked||savingRef.current)return;
  const valid=pendingMarkBatch(edits,new Map(rows.map(s=>[s.id,s])),subjectsByStudent);
  if(!valid.ready.length){
   if(valid.invalid.length)setError(valid.invalid[0].reason);
   return;
  }
  savingRef.current=true;setSending(true);setSaved("");setError("");
  let savedCount=0;
  try{
   for(let i=0;i<valid.ready.length;i+=50){
    const batch=valid.ready.slice(i,i+50);
    // Existing authenticated batch endpoint; validation and staff permissions stay server-side.
    const result=await mutate("marks.batch",{examId,entries:batch});
    if(!result)throw Error("Network or validation error. Your edits are still here.");
    savedCount+=batch.length;
    setSheet(old=>{
     const next=[...old];
     for(const item of batch){
      const index=next.findIndex(x=>x.studentId===item.studentId&&x.subjectId===item.subjectId);
      const previous=index>=0?next[index]:null;
      const updated={...(previous||{}),studentId:item.studentId,subjectId:item.subjectId,
       scores:{...(previous?.scores||{}),...item.scores}};
      if(index>=0)next[index]=updated;else next.push(updated);
     }
     return next;
    });
    setEdits(old=>clearSavedMarkEdits(old,batch));
   }
   if(valid.invalid.length)setError(valid.invalid[0].reason);
   else setSaved("All changes saved");
  }catch(e){setError("Auto-save failed: "+e.message+" · Changes kept locally. Retry when ready.")}
  finally{
   savingRef.current=false;setSending(false);
   if(savedCount)setAttempt(a=>a+1); // pick up edits typed while the request was in flight
  }
 }
 useEffect(()=>{
  if(!examId||loading||locked||!Object.keys(edits).length||savingRef.current)return;
  const timer=setTimeout(()=>{save()},900);
  return()=>clearTimeout(timer);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[edits,examId,grade,group,locked,loading,attempt]);
 return <section className="hmrs-sheet panel" aria-label="Excel score entry">
  <div className="hmrs-sheet-heading"><strong>Marks Entry Sheet</strong>
   <span className="hmrs-autosave-status" role="status" aria-live="polite">
    {sending?"Saving…":error&&entries.length?"Auto-save needs attention":entries.length?"Unsaved changes · saving automatically…":saved||"Auto-save enabled"}
   </span>
   <button className="btn sm" type="button" disabled={!rows.length||!examId||loading} onClick={printCompactSheet}>Print / Save PDF</button>
   {error&&entries.length&&<button className="btn sm" type="button" onClick={()=>{setError("");setAttempt(v=>v+1)}}><RefreshCw size={14}/> Retry</button>}</div>
  <div className="hmrs-sheet-filters">
   <label className="field">Exam<select value={examId} onChange={e=>{if(changeGuard())onExamChange(e.target.value)}}>
    <option value="">Select exam</option>{exams.map(e=><option key={e.id} value={e.id}>{e.name} · {examScopeLabel(e)}{e.published?" (Published)":""}</option>)}</select></label>
   <label className="field">Class<select value={grade} disabled={!!scopedGrade} onChange={e=>{if(changeGuard()){setGrade(e.target.value);setGroup("")}}}>{grades.filter(n=>!scopedGrade||n===scopedGrade).map(n=><option key={n} value={n}>{enGrade(n)}</option>)}</select></label>
   {Number(grade)>=9&&<label className="field">Group<select value={group} onChange={e=>{if(changeGuard())setGroup(e.target.value)}}>
    {groupOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}
   <label className="field">Subject / Paper<select value={subjectId} onChange={e=>setSubjectId(e.target.value)}>
    <option value="">All subjects</option>{groups.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
  </div>
  {locked&&<p className="alert">Published results can only be edited by the Head Teacher.</p>}
  {error&&<p className="alert error" role="alert">{error}</p>}
  {saved&&<p className="alert" role="status"><Check size={14}/> {saved}</p>}
  
  {!examId?<p className="empty">Select an exam</p>:loading?<p role="status" className="empty">Loading marks...</p>:!rows.length?<p className="empty">No students in this class or group.</p>:<>
   <div className="hmrs-sheet-scroll" role="region" tabIndex={0} aria-label="Marks spreadsheet" ref={tableRef}>
    <table className="hmrs-sheet-table"><thead><tr>
      <th rowSpan={2} className="hmrs-sheet-sticky hmrs-sheet-roll">Roll</th>
      <th rowSpan={2} className="hmrs-sheet-sticky hmrs-sheet-name">Student</th>
      {displayed.map(g=><th colSpan={g.parts.length} key={g.id}>{g.name}</th>)}
     </tr><tr>{displayed.flatMap(g=>g.parts.map(part=><th key={g.id+":"+part.key}>{part.label}</th>))}</tr></thead>
     <tbody>{rows.map((student,index)=>{
       const own=subjectsByStudent.get(student.id)||[];
       let col=-1;
       return <tr key={student.id}>
        <td className="hmrs-sheet-sticky hmrs-sheet-roll">{enNumber(student.roll)}</td>
        <td className="hmrs-sheet-sticky hmrs-sheet-name" title={student.name}>{student.name}</td>
        {displayed.flatMap(g=>g.parts.map(part=>{
         const column=++col,subject=own.find(s=>s.id===g.subjectId);
         const valid=subject?.parts.find(p=>p.key===part.key);
         if(!valid)return <td className="hmrs-sheet-na" key={g.id+":"+part.key}>—</td>;
         const touched=Object.prototype.hasOwnProperty.call(edits[keyFor(student.id,g.subjectId)]||{},part.key);
         return <td key={g.id+":"+part.key} className={touched?"hmrs-sheet-changed":""}>
          <input data-sheet-row={index} data-sheet-col={column} aria-label={student.name+" — "+g.name+" — "+part.label}
           value={scoreFor(student,g,part)} onChange={e=>put(student,g,part,e.target.value)}
           onKeyDown={e=>moveCell(e,index,column)} inputMode="decimal" disabled={locked}
           maxLength={6} title={"Maximum "+enNumber(valid.max)} placeholder="—"/>
         </td>;
        }))}</tr>;
     })}</tbody></table>
   </div>
   <div className="hmrs-sheet-bottom"><span>{enNumber(displayed.length)} subject/paper groups · All valid changes auto-save</span></div>
  </>}
 </section>;
}
