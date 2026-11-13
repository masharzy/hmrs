"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, Save } from "lucide-react";
import { getSubjects } from "../lib/academic";
import { gradeLabel, toBanglaDigits, toAsciiDigits } from "../lib/bangla-numbers";

const grades=[6,7,8,9,10];
const keyFor=(studentId,subjectId)=>studentId+"|"+subjectId;
const getList=(student)=>{
 try{return getSubjects(student.grade,student.group,student.elective,student.fourthSubject)}
 catch{return []}
};
const sortStudents=(a,b)=>Number(a.roll)-Number(b.roll)||String(a.name).localeCompare(String(b.name),"bn");
export default function ResultEntryGrid({exams,examId,onExamChange,students,actor,request,mutate,working}){
 const [grade,setGrade]=useState("6"),[subjectId,setSubjectId]=useState("");
 const [sheet,setSheet]=useState([]),[edits,setEdits]=useState({});
 const [loading,setLoading]=useState(false),[sending,setSending]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState("");
 const [revision,setRevision]=useState(0);
 const exam=exams.find(e=>e.id===examId);
 const rows=useMemo(()=>students.filter(s=>Number(s.grade)===Number(grade)).sort(sortStudents),[students,grade]);
 const subjectsByStudent=useMemo(()=>new Map(rows.map(s=>[s.id,getList(s)])),[rows]);
 const groups=useMemo(()=>{
  const map=new Map();
  for(const specs of subjectsByStudent.values())for(const subject of specs){
   if(!map.has(subject.id))map.set(subject.id,{id:subject.id,name:subject.name,parts:new Map()});
   for(const part of subject.parts)map.get(subject.id).parts.set(part.key,{key:part.key,label:part.label});
  }
  return [...map.values()].map(s=>({...s,parts:[...s.parts.values()]}));
 },[subjectsByStudent]);
 const displayed=subjectId?groups.filter(s=>s.id===subjectId):groups;
 const byKey=useMemo(()=>new Map(sheet.map(m=>[keyFor(m.studentId,m.subjectId),m.scores||{}])),[sheet]);
 useEffect(()=>{setSubjectId("");setEdits({});setSaved("");setError("")},[grade,examId]);
 useEffect(()=>{
  let live=true;
  setSheet([]);setLoading(!!examId);setError("");setSaved("");
  if(!examId){setLoading(false);return;}
  request("marks",{params:"examId="+encodeURIComponent(examId)+"&grade="+encodeURIComponent(grade)})
   .then(result=>{if(live)setSheet(result.items||[])})
   .catch(e=>{if(live)setError(e.message)})
   .finally(()=>{if(live)setLoading(false)});
  return ()=>{live=false};
 // request changes with each parent render; do not cause refetch loops.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[examId,grade,revision]);
 const entries=useMemo(()=>Object.entries(edits).map(([key,scores])=>{
  const separator=key.indexOf("|");
  return {studentId:key.slice(0,separator),subjectId:key.slice(separator+1),scores};
 }),[edits]);
 const locked=!!exam?.published&&actor?.role!=="principal";
 function scoreFor(student,group,part){
  const recordKey=keyFor(student.id,group.id);
  const changed=edits[recordKey];
  const scores=changed||byKey.get(recordKey)||{};
  return scores[part.key]??"";
 }
 function put(student,group,part,value){
  const recordKey=keyFor(student.id,group.id),original=byKey.get(recordKey)||{};
  setEdits(old=>({...old,[recordKey]:{...original,...old[recordKey],[part.key]:toAsciiDigits(value)}}));
  setError("");setSaved("");
 }
 async function save(){
  if(!examId||loading||working||sending||locked)return;
  if(!entries.length)return;
  const rowMap=new Map(rows.map(s=>[s.id,s]));
  for(const entry of entries){
   const student=rowMap.get(entry.studentId),subject=student&&subjectsByStudent.get(student.id)?.find(s=>s.id===entry.subjectId);
   if(!subject){setError("বিষয় বা শিক্ষার্থী সঠিক নয়।");return;}
   for(const part of subject.parts){
    const raw=entry.scores[part.key];
    if(raw===""||raw===null||raw===undefined||!Number.isFinite(Number(raw))||Number(raw)<0||Number(raw)>part.max){
     setError(student.name+" — "+subject.name+" এর "+part.label+" ০–"+toBanglaDigits(part.max)+" এর মধ্যে পূরণ করুন।");return;
    }
   }
  }
  setSending(true);setSaved("");setError("");
  try{
   for(let i=0;i<entries.length;i+=50){
    const part=entries.slice(i,i+50);
    const result=await mutate("marks.batch",{examId,entries:part});
    if(!result)throw Error("নম্বর সংরক্ষণ সম্পন্ন হয়নি। আবার চেষ্টা করুন।");
   }
   setEdits({});setSaved(toBanglaDigits(entries.length)+"টি বিষয়ের নম্বর সংরক্ষিত হয়েছে");
   setRevision(v=>v+1);
  }catch(e){setError(e.message)}
  finally{setSending(false)}
 }
 return <section className="hmrs-sheet panel p-5" aria-label="শ্রেণিভিত্তিক নম্বর এন্ট্রি">
  <div className="hmrs-sheet-heading"><div><h2 className="section-title">শ্রেণিভিত্তিক নম্বর এন্ট্রি</h2><p className="muted text-xs">একজন শিক্ষার্থী এক সারিতে, বিষয় ও নম্বরের অংশ আলাদা কলামে। বাংলা বা ইংরেজি সংখ্যা লিখতে পারবেন।</p></div>
   <button className="btn primary" type="button" disabled={!entries.length||!examId||loading||working||sending||locked} onClick={save}><Save size={16}/>{sending?"সংরক্ষণ হচ্ছে...":"পরিবর্তিত নম্বর সংরক্ষণ ("+toBanglaDigits(entries.length)+")"}</button>
  </div>
  <div className="hmrs-sheet-filters">
   <label className="field">পরীক্ষা<select value={examId} onChange={e=>onExamChange(e.target.value)}>{[["","পরীক্ষা নির্বাচন করুন"],...exams.map(e=>[e.id,e.name+(e.published?" (প্রকাশিত)":"")])].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   <label className="field">শ্রেণি<select value={grade} onChange={e=>setGrade(e.target.value)}>{grades.map(n=><option key={n} value={n}>{gradeLabel(n)}</option>)}</select></label>
   <label className="field">বিষয়<select value={subjectId} onChange={e=>setSubjectId(e.target.value)}><option value="">সব বিষয়</option>{groups.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
  </div>
  {locked&&<p className="alert">প্রকাশিত পরীক্ষার নম্বর শুধু প্রধান শিক্ষক পরিবর্তন করতে পারবেন।</p>}
  {error&&<p className="alert error" role="alert">{error}</p>}
  {saved&&<p className="alert" role="status"><Check size={15}/> {saved}</p>}
  {!examId?<p className="empty">প্রথমে পরীক্ষা নির্বাচন করুন।</p>:loading?<p role="status" className="empty">নম্বর লোড হচ্ছে...</p>:!rows.length?<p className="empty">এই শ্রেণিতে কোনো শিক্ষার্থী নেই।</p>:<>
   <div className="hmrs-sheet-scroll" role="region" tabIndex={0} aria-label="নম্বরের স্প্রেডশিট; ডানে-বামে স্ক্রল করুন">
    <table className="hmrs-sheet-table">
     <thead><tr><th rowSpan={2} className="hmrs-sheet-sticky hmrs-sheet-serial">ক্রমিক</th><th rowSpan={2} className="hmrs-sheet-sticky hmrs-sheet-roll">রোল</th><th rowSpan={2} className="hmrs-sheet-sticky hmrs-sheet-name">শিক্ষার্থীর নাম</th>
      {displayed.map(s=><th colSpan={s.parts.length} key={s.id}>{s.name}</th>)}</tr>
      <tr>{displayed.flatMap(s=>s.parts.map(p=><th key={s.id+":"+p.key}>{p.label}</th>))}</tr></thead>
     <tbody>{rows.map((student,index)=>{
      const studentSubjects=subjectsByStudent.get(student.id)||[];
      return <tr key={student.id}><td className="hmrs-sheet-sticky hmrs-sheet-serial">{toBanglaDigits(index+1)}</td><td className="hmrs-sheet-sticky hmrs-sheet-roll">{toBanglaDigits(student.roll)}</td><td className="hmrs-sheet-sticky hmrs-sheet-name">{student.name}</td>
       {displayed.flatMap(group=>group.parts.map(part=>{
        const subject=studentSubjects.find(s=>s.id===group.id);
        const ownPart=subject?.parts.find(p=>p.key===part.key);
        if(!ownPart)return <td className="hmrs-sheet-na" key={group.id+":"+part.key}>—</td>;
        const value=scoreFor(student,group,part);
        const touched=Object.prototype.hasOwnProperty.call(edits,keyFor(student.id,group.id));
        return <td key={group.id+":"+part.key} className={touched?"hmrs-sheet-changed":""}><input aria-label={student.name+" — "+group.name+" — "+part.label} value={value} onChange={e=>put(student,group,part,e.target.value)} inputMode="decimal" maxLength={7} disabled={locked||sending} title={"পূর্ণ নম্বর "+toBanglaDigits(ownPart.max)} placeholder={"০–"+toBanglaDigits(ownPart.max)}/></td>
       }))}</tr>;
     })}</tbody>
    </table>
   </div>
   <div className="hmrs-sheet-bottom"><span>{toBanglaDigits(rows.length)} জন · {toBanglaDigits(displayed.length)}টি বিষয় · {toBanglaDigits(entries.length)}টি পরিবর্তিত রেকর্ড</span>
    <button className="btn primary" type="button" disabled={!entries.length||!examId||loading||working||sending||locked} onClick={save}><Save size={16}/> পরিবর্তন সংরক্ষণ</button>
   </div>
  </>}
 </section>;
}
