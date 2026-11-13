"use client";
import { useState } from "react";
import { FileUp, AlertTriangle, Check, FileCheck } from "lucide-react";
import { firebaseAuth } from "../lib/firebase-client";
import { toBanglaDigits } from "../lib/bangla-numbers";
export default function SelectionImportPanel({onImported}){
 const [pack,setPack]=useState(null),[filename,setFilename]=useState("");
 const [preview,setPreview]=useState(null),[result,setResult]=useState(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[confirmed,setConfirmed]=useState(false);
 async function loadFile(e){
  const file=e.target.files?.[0];setPack(null);setPreview(null);setResult(null);setError("");setConfirmed(false);
  if(!file)return;
  if(file.size>100000){setError("১০০ KB-এর ছোট import JSON ফাইল দিন");return}
  try{
   const data=JSON.parse(await file.text());
   if(data?.version!==1||!Array.isArray(data.students))throw Error("সঠিক result import JSON ফাইল নয়");
   setPack(data);setFilename(file.name);
  }catch(e){setError(e.message)}
 }
 async function send(mode){
  if(!pack||busy)return;setBusy(true);setError("");
  try{
   const user=firebaseAuth().currentUser;
   if(!user)throw Error("প্রধান শিক্ষক হিসেবে পুনরায় লগইন করুন");
   const token=await user.getIdToken();
   const response=await fetch("/api/selection-import",{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
    body:JSON.stringify({mode,pack,confirmed:mode==="apply"&&confirmed})
   });
   const data=await response.json();
   if(!response.ok)throw Error(data.error||"Import ব্যর্থ হয়েছে");
   if(mode==="preview"){setPreview(data);setResult(null)}
   else{setResult(data);setConfirmed(false);if(onImported)onImported(data.examId)}
  }catch(e){setError(e.message)}
  finally{setBusy(false)}
 }
 return <section className="hmrs-import panel" aria-label="নির্বাচনী পরীক্ষার ফলাফল import">
  <div className="hmrs-import-head"><FileUp size={18}/><div><b>Class 10 নির্বাচনী পরীক্ষার ফলাফল Import</b>
   <p className="muted text-xs">Science, Business Studies ও Humanities — JSON import pack। আগে preview, তারপর নিশ্চিত করে প্রয়োগ করুন।</p></div></div>
  <label className="field">Import JSON ফাইল<input type="file" accept=".json,application/json" onChange={loadFile}/></label>
  {filename&&<p className="muted text-xs">ফাইল: {filename} · {toBanglaDigits(pack?.students?.length||0)} জন</p>}
  {error&&<p className="alert error" role="alert">{error}</p>}
  <div className="inline-actions"><button type="button" className="btn sm primary" disabled={!pack||busy} onClick={()=>send("preview")}>
   <FileCheck size={15}/>{busy?"যাচাই হচ্ছে...":"আগে Preview দেখুন"}</button></div>
  {preview&&<div className="hmrs-import-preview">
   <p><b>Database মিলিয়ে পাওয়া:</b> {toBanglaDigits(preview.summary.matched)} / {toBanglaDigits(preview.summary.total)} জন</p>
   <div className="hmrs-import-statline"><span>সংশোধনযোগ্য পুরোনো রোল: {toBanglaDigits(preview.summary.normalizeRolls)}</span>
    <span>নম্বর রেকর্ড: {toBanglaDigits(preview.summary.scoreRecords)}</span>
    <span>নম্বরের ঘর: {toBanglaDigits(preview.summary.scoreParts)}</span></div>
   {(preview.review?.length>0||preview.skipped?.length>0)&&<div className="hmrs-import-warning"><AlertTriangle size={16}/>
    <span>{toBanglaDigits(preview.review?.length||0)} জনের পরিচয় যাচাই দরকার; {toBanglaDigits(preview.summary.skippedSubjectRecords)}টি বিষয় বর্তমান subject settings-এর সঙ্গে মেলেনি। এসব তথ্য লিখবে না।</span></div>}
   {!!preview.review?.length&&<div className="hmrs-import-review">
    <b>Review প্রয়োজন</b>{preview.review.map((r,i)=><p key={i}>{r.group} · রোল {toBanglaDigits(r.roll)} · {r.name} — {r.reason}</p>)}
   </div>}
   {!!preview.skipped?.length&&<details className="hmrs-import-review"><summary>যেসব বিষয়ের নম্বর এখন লেখা যাবে না</summary>
    {preview.skipped.map((r,i)=><p key={i}>{r.group} · {toBanglaDigits(r.roll)} · {r.name} — {r.subjects.map(s=>s.subjectId+" ("+s.reason+")").join(", ")}</p>)}
   </details>}
   <label className="hmrs-import-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>
    আমি preview যাচাই করেছি। মিলে যাওয়া শিক্ষার্থীর নতুন নম্বর import এবং পুরোনো ১০১/২০১ রোল সংশোধন করতে সম্মত। বিদ্যমান নম্বর overwrite হবে না।</label>
   <button type="button" className="btn primary" disabled={busy||!confirmed||!preview.summary.matched} onClick={()=>send("apply")}>
    <Check size={15}/>{busy?"Import চলছে...":"নির্বাচনী ফলাফল Import করুন"}</button>
  </div>}
  {result&&<div className="hmrs-import-done" role="status"><Check size={18}/>
   <div><b>Import সম্পন্ন — {toBanglaDigits(result.applied.students)} জন</b>
    <p>{toBanglaDigits(result.applied.subjects)}টি বিষয়, {toBanglaDigits(result.applied.cells)}টি নতুন নম্বর, {toBanglaDigits(result.applied.normalizedRolls)}টি রোল সংশোধিত।</p>
    {!!result.failures?.length&&<details><summary>ব্যর্থ: {toBanglaDigits(result.failures.length)} জন</summary>
     {result.failures.map((f,i)=><p key={i}>{f.group} · {toBanglaDigits(f.roll)} — {f.reason}</p>)}</details>}
   </div></div>}
 </section>;
}
