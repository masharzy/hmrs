"use client";
import {useState} from "react";
import {FileUp,AlertTriangle,Check,FileCheck,RefreshCw,Users} from "lucide-react";
import {firebaseAuth} from "../lib/firebase-client";
import {toBanglaDigits} from "../lib/bangla-numbers";
import {groupNames} from "../lib/student-admin";
const bn=value=>toBanglaDigits(value??0);
const who=row=>(groupNames[row.group]||row.group)+" · রোল "+bn(row.roll??row.oldRoll)+" · "+(row.name||"");
export default function SelectionImportPanel({onImported,onRollChanged}){
 const [pack,setPack]=useState(null),[filename,setFilename]=useState("");
 const [preview,setPreview]=useState(null),[result,setResult]=useState(null);
 const [rollPreview,setRollPreview]=useState(null),[rollResult,setRollResult]=useState(null);
 const [busy,setBusy]=useState(""),[error,setError]=useState("");
 const [confirmed,setConfirmed]=useState(false),[rollConfirmed,setRollConfirmed]=useState(false);
 async function loadFile(e){
  const file=e.target.files?.[0];
  setPack(null);setFilename("");setPreview(null);setResult(null);setError("");setConfirmed(false);
  if(!file)return;
  if(file.size>100000){setError("১০০ KB-এর ছোট Import JSON ফাইল দিন");return}
  try{
   const parsed=JSON.parse(await file.text());
   if(parsed?.version!==1||!Array.isArray(parsed.students))throw Error("সঠিক result import JSON ফাইল নয়");
   setPack(parsed);setFilename(file.name);
  }catch(e){setError(e.message)}
 }
 async function send(mode){
  if(busy||(["preview","apply"].includes(mode)&&!pack))return;
  setBusy(mode);setError("");
  try{
   const user=firebaseAuth().currentUser;
   if(!user)throw Error("প্রধান শিক্ষক হিসেবে আবার লগইন করুন");
   const token=await user.getIdToken();
   const response=await fetch("/api/selection-import",{
    method:"POST",cache:"no-store",credentials:"same-origin",
    headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
    body:JSON.stringify({mode,...(["preview","apply"].includes(mode)?{pack}:{}),
     confirmed:mode==="apply"?confirmed:mode==="roll-apply"?rollConfirmed:false})
   });
   let data;
   try{data=await response.json()}
   catch{throw Error("সার্ভার থেকে সঠিক response পাওয়া যায়নি (HTTP "+response.status+")")}
   if(!response.ok)throw Error(data.error||"অনুরোধ ব্যর্থ হয়েছে (HTTP "+response.status+")");
   if(mode==="preview"){setPreview(data);setResult(null);setConfirmed(false)}
   else if(mode==="apply"){
    setResult(data);setConfirmed(false);
    if(onImported)Promise.resolve(onImported(data.examId)).catch(e=>setError("Import হয়েছে, কিন্তু তালিকা refresh হয়নি: "+e.message));
   }else if(mode==="roll-preview"){setRollPreview(data.rollPlan);setRollResult(null);setRollConfirmed(false)}
   else{
    setRollResult(data.rollApplied);setRollConfirmed(false);setRollPreview(null);
    if(onRollChanged)Promise.resolve(onRollChanged()).catch(e=>setError("রোল সংশোধন হয়েছে, কিন্তু তালিকা refresh হয়নি: "+e.message));
   }
  }catch(e){setError(e.message)}
  finally{setBusy("")}
 }
 const allowed=preview?.summary?.matched+preview?.summary?.create>0;
 return <section className="hmrs-import panel" aria-label="নির্বাচনী পরীক্ষার ফলাফল import">
  <div className="hmrs-import-head"><FileUp size={18}/><div>
   <b>১০ম শ্রেণির নির্বাচনী পরীক্ষা — Excel ফলাফল Import</b>
   <p className="muted text-xs">বিভাগ ও রোল মিলিয়ে বিদ্যমান শিক্ষার্থী সংশোধন; নতুন শিক্ষার্থী হলে সতর্কতা-সহ তৈরি হবে।</p>
  </div></div>
  <div className="hmrs-import-rolls">
   <div><b>পুরোনো ১০১ / ২০১ ধরনের রোল সংশোধন</b><p>সব নবম-দশম শ্রেণিতে বিভাগ অনুযায়ী আলাদা রোল ১, ২, ৩… করা যাবে। নম্বর পরিবর্তন হবে না।</p></div>
   <button className="btn sm" disabled={!!busy} type="button" onClick={()=>send("roll-preview")}>
    <RefreshCw size={14}/>{busy==="roll-preview"?"যাচাই হচ্ছে...":"১০১/২০১ রোল ঠিক করুন"}</button>
  </div>
  {rollPreview&&<div className="hmrs-import-preview">
   <b>রোল সংশোধনের Preview: {bn(rollPreview.count)} জন</b>
   <p className="muted text-xs">সংশোধন: {bn(rollPreview.count)} · দ্বন্দ্ব: {bn(rollPreview.conflicts?.length||0)}। আগে যাচাই করুন।</p>
   {!!rollPreview.changes?.length&&<details className="hmrs-import-review"><summary>পরিবর্তনের তালিকা দেখুন</summary>
    {rollPreview.changes.map((x,i)=><p key={i}>{groupNames[x.group]} · শ্রেণি {bn(x.grade)} · {x.name}: {bn(x.oldRoll)} → {bn(x.roll)}</p>)}
   </details>}
   {!!rollPreview.conflicts?.length&&<details className="hmrs-import-review"><summary><AlertTriangle size={14}/> দ্বন্দ্বযুক্ত রোল {bn(rollPreview.conflicts.length)}টি — এগুলো পরিবর্তন হবে না</summary>
    {rollPreview.conflicts.map((x,i)=><p key={i}>{who(x)} · {x.reason}</p>)}</details>}
   {!!rollPreview.count&&<><label className="hmrs-import-confirm"><input type="checkbox" checked={rollConfirmed} onChange={e=>setRollConfirmed(e.target.checked)}/>
    আমি রোল সংশোধনের Preview দেখেছি। শিক্ষার্থী ও পরীক্ষার আগের রেকর্ড অক্ষত থাকবে।</label>
    <button className="btn primary sm" disabled={!rollConfirmed||!!busy} type="button" onClick={()=>send("roll-apply")}><Check size={14}/> রোল সংশোধন নিশ্চিত করুন</button></>}
  </div>}
  {rollResult&&<p className="hmrs-import-done" role="status"><Check size={17}/> {bn(rollResult.changed)} জনের রোল সংশোধন হয়েছে।
   {!!rollResult.failures?.length&&" "+bn(rollResult.failures.length)+"টি ব্যর্থ হয়েছে; Preview করে যাচাই করুন।"}</p>}

  <label className="field">নির্বাচনী পরীক্ষার Import JSON
   <input type="file" accept=".json,application/json" onChange={loadFile}/>
  </label>
  {filename&&<p className="muted text-xs">ফাইল: {filename} · {bn(pack?.students?.length)} জন</p>}
  {error&&<p className="alert error" role="alert"><AlertTriangle size={15}/>{error}</p>}
  <div className="inline-actions"><button type="button" className="btn primary sm" disabled={!pack||!!busy} onClick={()=>send("preview")}>
   <FileCheck size={15}/>{busy==="preview"?"যাচাই হচ্ছে...":"ফলাফল Preview দেখুন"}</button></div>
  {preview&&<div className="hmrs-import-preview">
   <div className="hmrs-import-review-title"><Users size={15}/><b>Database ও Excel মিলিয়ে Import Preview</b></div>
   <div className="hmrs-import-statline">
    <span>বিদ্যমান: {bn(preview.summary.matched)}</span>
    <span>নতুন তৈরি হবে: {bn(preview.summary.create)}</span>
    <span>নাম সংশোধন: {bn(preview.summary.rename)}</span>
    <span>রোল সংশোধন: {bn(preview.summary.normalizeRolls)}</span>
    <span>নম্বর: {bn(preview.summary.scoreParts)} ঘর</span>
   </div>
   {!!preview.summary.create&&<div className="hmrs-import-warning"><AlertTriangle size={16}/>
    <span>{bn(preview.summary.create)} জন নতুন শিক্ষার্থী Student List-এ যুক্ত হবে। তাদের মোবাইল, PIN ও বাকি তথ্য না থাকায় সতর্কতা চিহ্ন দেখাবে।</span></div>}
   {!!preview.additions?.length&&<details className="hmrs-import-review"><summary>নতুন শিক্ষার্থীদের তালিকা ({bn(preview.additions.length)})</summary>
    {preview.additions.map((r,i)=><p key={i}>{who(r)}</p>)}</details>}
   {!!preview.changes?.length&&<details className="hmrs-import-review"><summary>যাদের নাম বা রোল সংশোধন হবে ({bn(preview.changes.length)})</summary>
    {preview.changes.map((r,i)=><p key={i}>{groupNames[r.group]} · রোল {bn(r.oldRoll)} → {bn(r.roll)} · {r.previousName} → <b>{r.name}</b></p>)}</details>}
   {!!preview.review?.length&&<div className="hmrs-import-warning"><AlertTriangle size={16}/>
    <span>{bn(preview.review.length)} জনের পরিচয়ে দ্বন্দ্ব আছে। ভুল অ্যাকাউন্টে নম্বর না দিয়ে এদের বাদ দেওয়া হবে।</span></div>}
   {!!preview.review?.length&&<details className="hmrs-import-review"><summary>দ্বন্দ্বযুক্ত শিক্ষার্থী ({bn(preview.review.length)})</summary>
    {preview.review.map((r,i)=><p key={i}>{who(r)} — {r.reason}</p>)}</details>}
   {!!preview.skipped?.length&&<details className="hmrs-import-review"><summary>যেসব বিষয়ের নম্বর আপাতত লেখা যাবে না ({bn(preview.summary.skippedSubjectRecords)})</summary>
    {preview.skipped.map((r,i)=><p key={i}>{who(r)} — {r.subjects.map(s=>s.subjectId+" ("+s.reason+")").join(", ")}</p>)}
   </details>}
   <label className="hmrs-import-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>
    আমি Preview দেখেছি। অনুপস্থিত শিক্ষার্থীদের অসম্পূর্ণ প্রোফাইল তৈরি, সংশ্লিষ্ট নাম/রোল সংশোধন এবং নতুন নম্বর Import করতে সম্মত। পুরোনো নম্বর overwrite হবে না।</label>
   <button type="button" className="btn primary" disabled={!!busy||!confirmed||!allowed} onClick={()=>send("apply")}>
    <Check size={15}/>{busy==="apply"?"Import চলছে...":"নির্বাচনী ফলাফল Import করুন"}</button>
   {!allowed&&<p className="muted text-xs">সব রেকর্ডে দ্বন্দ্ব থাকলে Import করা যাবে না।</p>}
  </div>}
  {result&&<div className="hmrs-import-done" role="status"><Check size={18}/>
   <div><b>{bn(result.applied.students)} জনের ফলাফল Import হয়েছে</b>
    <p>নতুন শিক্ষার্থী: {bn(result.applied.created)} · নাম সংশোধন: {bn(result.applied.renamed)} · রোল সংশোধন: {bn(result.applied.normalizedRolls)}</p>
    <p>{bn(result.applied.subjects)}টি বিষয়, {bn(result.applied.cells)}টি নতুন নম্বর। আগে সংরক্ষিত {bn(result.applied.preservedExisting)}টি নম্বর অক্ষত।</p>
    {!!result.failures?.length&&<details><summary>ব্যর্থ: {bn(result.failures.length)} জন (কারণ দেখুন)</summary>
     {result.failures.map((f,i)=><p key={i}>{who(f)} — {f.reason}</p>)}</details>}
   </div></div>}
 </section>;
}
