"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Save } from "lucide-react";
import { getSubjects } from "../lib/academic";
import { gradeLabel, toBanglaDigits, toAsciiDigits } from "../lib/bangla-numbers";

const grades=[6,7,8,9,10],groupOptions=[["","সব বিভাগ"],["science","বিজ্ঞান"],["business","ব্যবসায় শিক্ষা"],["humanities","মানবিক"]];
const keyFor=(studentId,subjectId)=>studentId+"|"+subjectId;
const getList=student=>{try{return getSubjects(student.grade,student.group,student.elective,student.fourthSubject)}catch{return []}};
const sortStudents=(a,b)=>Number(a.roll)-Number(b.roll)||String(a.name).localeCompare(String(b.name),"bn");
// Present papers as separate Excel column groups; retain one subject ID in Firestore/GPA.
function displayGroups(specs){
 const map=new Map();
 for(const subjects of specs.values())for(const subject of subjects){
  for(const part of subject.parts){
   const paper=part.paper||(part.key==="first"?"১ম পত্র":part.key==="second"?"২য় পত্র":"");
   const name=paper?(paper.startsWith(subject.name)?paper:subject.name+" "+paper):subject.name;
   const id=subject.id+"::"+(paper||"all");
   if(!map.has(id))map.set(id,{id,subjectId:subject.id,name,parts:new Map()});
   const shortLabel=paper ? (part.key==="first"||part.key==="second"?"নম্বর":part.label) : part.label;
   map.get(id).parts.set(part.key,{...part,label:shortLabel});
  }
 }
 return [...map.values()].map(group=>({...group,parts:[...group.parts.values()]}));
}
export default function ResultEntryGrid({exams,examId,onExamChange,students,actor,request,mutate,working}){
 const [grade,setGrade]=useState("6"),[group,setGroup]=useState(""),[subjectId,setSubjectId]=useState("");
 const [sheet,setSheet]=useState([]),[edits,setEdits]=useState({});
 const [loading,setLoading]=useState(false),[sending,setSending]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState("");
 const [revision,setRevision]=useState(0),tableRef=useRef(null);
 const exam=exams.find(e=>e.id===examId);
 const rows=useMemo(()=>students.filter(s=>Number(s.grade)===Number(grade)&&(!group||s.group===group)).sort(sortStudents),[students,grade,group]);
 const subjectsByStudent=useMemo(()=>new Map(rows.map(s=>[s.id,getList(s)])),[rows]);
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
 },[examId,grade,revision]);
 const entries=useMemo(()=>Object.entries(edits).map(([key,scores])=>{
  const i=key.indexOf("|");return {studentId:key.slice(0,i),subjectId:key.slice(i+1),scores};
 }),[edits]);
 const locked=!!exam?.published&&actor?.role!=="principal";
 const changeGuard=()=>!entries.length||window.confirm("সংরক্ষণ না করা নম্বর আছে। এগুলো বাদ দিয়ে পরিবর্তন করবেন?");
 function scoreFor(student,subject,part){
  const key=keyFor(student.id,subject.subjectId);
  return edits[key]?.[part.key]??byKey.get(key)?.[part.key]??"";
 }
 function put(student,subject,part,value){
  const key=keyFor(student.id,subject.subjectId);
  setEdits(old=>({...old,[key]:{...old[key],[part.key]:toAsciiDigits(value)}}));
  setError("");setSaved("");
 }
 function moveCell(event,row,col){
  if(!["Enter","ArrowDown","ArrowUp"].includes(event.key))return;
  if(event.key==="Enter"||event.key==="ArrowDown")row++;
  else row--;
  const input=tableRef.current?.querySelector('input[data-sheet-row="'+row+'"][data-sheet-col="'+col+'"]');
  if(input){event.preventDefault();input.focus();input.select()}
 }
 async function save(){
  if(!examId||loading||working||sending||locked||!entries.length)return;
  const rowMap=new Map(rows.map(s=>[s.id,s]));
  for(const entry of entries){
   const student=rowMap.get(entry.studentId);
   const subject=student&&subjectsByStudent.get(student.id)?.find(s=>s.id===entry.subjectId);
   if(!subject){setError("বিষয় বা শিক্ষার্থী পাওয়া যায়নি");return;}
   const parts=new Map(subject.parts.map(p=>[p.key,p]));
   for(const [key,raw] of Object.entries(entry.scores)){
    const part=parts.get(key);
    if(!part||raw===""||!Number.isFinite(Number(raw))||Number(raw)<0||Number(raw)>part.max){
     setError(student.name+" — "+subject.name+" এর "+(part?.label||key)+" ০–"+toBanglaDigits(part?.max||0)+" এর মধ্যে দিন");return;
    }
   }
  }
  setSending(true);setError("");setSaved("");
  let processed=0;
  try{
   for(let i=0;i<entries.length;i+=50){
    const batch=entries.slice(i,i+50);
    const result=await mutate("marks.batch",{examId,entries:batch});
    if(!result)throw Error("নম্বর সংরক্ষণ ব্যর্থ হয়েছে");
    processed+=batch.length;
    const committed=new Set(batch.map(e=>keyFor(e.studentId,e.subjectId)));
    setEdits(old=>Object.fromEntries(Object.entries(old).filter(([key])=>!committed.has(key))));
   }
   setSaved(toBanglaDigits(processed)+"টি নম্বর রেকর্ড সংরক্ষিত হয়েছে");setRevision(v=>v+1);
  }catch(e){setError(toBanglaDigits(processed)+"টি সংরক্ষিত হয়েছে। "+e.message)}
  finally{setSending(false)}
 }
 return <section className="hmrs-sheet panel" aria-label="Excel ধরনের নম্বর এন্ট্রি">
  <div className="hmrs-sheet-heading"><strong>নম্বর এন্ট্রি শিট</strong><span>{toBanglaDigits(rows.length)} জন · {toBanglaDigits(entries.length)}টি পরিবর্তন</span>
   <button className="btn primary sm" type="button" disabled={!entries.length||!examId||loading||working||sending||locked} onClick={save}><Save size={14}/>{sending?"সংরক্ষণ হচ্ছে...":"সংরক্ষণ"}</button></div>
  <div className="hmrs-sheet-filters">
   <label className="field">পরীক্ষা<select value={examId} onChange={e=>{if(changeGuard())onExamChange(e.target.value)}}>
    <option value="">পরীক্ষা নির্বাচন করুন</option>{exams.map(e=><option key={e.id} value={e.id}>{e.name}{e.published?" (প্রকাশিত)":""}</option>)}</select></label>
   <label className="field">শ্রেণি<select value={grade} onChange={e=>{if(changeGuard()){setGrade(e.target.value);setGroup("")}}}>{grades.map(n=><option key={n} value={n}>{gradeLabel(n)}</option>)}</select></label>
   {Number(grade)>=9&&<label className="field">বিভাগ<select value={group} onChange={e=>{if(changeGuard())setGroup(e.target.value)}}>
    {groupOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}
   <label className="field">বিষয় / পত্র<select value={subjectId} onChange={e=>setSubjectId(e.target.value)}>
    <option value="">সব বিষয়</option>{groups.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
  </div>
  {locked&&<p className="alert">প্রকাশিত পরীক্ষার নম্বর শুধুমাত্র প্রধান শিক্ষক পরিবর্তন করতে পারবেন।</p>}
  {error&&<p className="alert error" role="alert">{error}</p>}
  {saved&&<p className="alert" role="status"><Check size={14}/> {saved}</p>}
  {Number(grade)>=9&&<p className="hmrs-sheet-hint">বাংলা ১ম ও ২য় পত্রের CQ/MCQ আলাদাভাবে লিখুন। পুরোনো একত্রিত বাংলা নম্বর সংরক্ষিত আছে; পত্রভিত্তিক ঘরে সেগুলো অনুমান করে ভাগ করা হবে না।</p>}
  {!examId?<p className="empty">পরীক্ষা নির্বাচন করুন</p>:loading?<p role="status" className="empty">নম্বর লোড হচ্ছে...</p>:!rows.length?<p className="empty">এই শ্রেণি বা বিভাগে কোনো শিক্ষার্থী নেই।</p>:<>
   <div className="hmrs-sheet-scroll" role="region" tabIndex={0} aria-label="নম্বরের শিট" ref={tableRef}>
    <table className="hmrs-sheet-table"><thead><tr>
      <th rowSpan={2} className="hmrs-sheet-sticky hmrs-sheet-serial">ক্র.</th>
      <th rowSpan={2} className="hmrs-sheet-sticky hmrs-sheet-roll">রোল</th>
      <th rowSpan={2} className="hmrs-sheet-sticky hmrs-sheet-name">নাম</th>
      {displayed.map(g=><th colSpan={g.parts.length} key={g.id}>{g.name}</th>)}
     </tr><tr>{displayed.flatMap(g=>g.parts.map(part=><th key={g.id+":"+part.key}>{part.label}</th>))}</tr></thead>
     <tbody>{rows.map((student,index)=>{
       const own=subjectsByStudent.get(student.id)||[];
       let col=-1;
       return <tr key={student.id}>
        <td className="hmrs-sheet-sticky hmrs-sheet-serial">{toBanglaDigits(index+1)}</td>
        <td className="hmrs-sheet-sticky hmrs-sheet-roll">{toBanglaDigits(student.roll)}</td>
        <td className="hmrs-sheet-sticky hmrs-sheet-name" title={student.name}>{student.name}</td>
        {displayed.flatMap(g=>g.parts.map(part=>{
         const column=++col,subject=own.find(s=>s.id===g.subjectId);
         const valid=subject?.parts.find(p=>p.key===part.key);
         if(!valid)return <td className="hmrs-sheet-na" key={g.id+":"+part.key}>—</td>;
         const touched=Object.prototype.hasOwnProperty.call(edits[keyFor(student.id,g.subjectId)]||{},part.key);
         return <td key={g.id+":"+part.key} className={touched?"hmrs-sheet-changed":""}>
          <input data-sheet-row={index} data-sheet-col={column} aria-label={student.name+" — "+g.name+" — "+part.label}
           value={scoreFor(student,g,part)} onChange={e=>put(student,g,part,e.target.value)}
           onKeyDown={e=>moveCell(e,index,column)} inputMode="decimal" disabled={locked||sending}
           maxLength={6} title={"পূর্ণ নম্বর "+toBanglaDigits(valid.max)} placeholder="—"/>
         </td>;
        }))}</tr>;
     })}</tbody></table>
   </div>
   <div className="hmrs-sheet-bottom"><span>ক্রমিক ১ থেকে শুরু · {toBanglaDigits(displayed.length)}টি বিষয়/পত্র</span>
    <button className="btn primary sm" type="button" disabled={!entries.length||!examId||loading||working||sending||locked} onClick={save}><Save size={14}/> {toBanglaDigits(entries.length)}টি পরিবর্তন সংরক্ষণ</button></div>
  </>}
 </section>;
}
