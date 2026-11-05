"use client";
import { useEffect, useRef, useState } from "react";
import { firebaseAuth } from "../lib/firebase-client";
import { toBanglaDigits } from "../lib/bangla-numbers";
import { routineGradeLabel } from "../lib/routines";
import { CalendarRange, Check, CheckCircle2, CloudUpload, FileImage, ImagePlus, Pencil, Trash2, X, ZoomIn } from "lucide-react";

const types=[["class","ক্লাস রুটিন"],["exam","পরীক্ষার রুটিন"]];
const grades=[["all","সব শ্রেণি"],["6","৬ষ্ঠ শ্রেণি"],["7","৭ম শ্রেণি"],["8","৮ম শ্রেণি"],["9","৯ম শ্রেণি"],["10","১০ম শ্রেণি"]];
const groups=[["all","সব বিভাগ"],["science","বিজ্ঞান"],["business","ব্যবসায় শিক্ষা"],["humanities","মানবিক"]];
const empty=()=>({id:"",kind:"class",grade:"all",group:"all",title:"",imageUrl:"",published:true});
const ACCEPT=["image/jpeg","image/png","image/webp"];
const MAX_SIZE=5*1024*1024;

export default function RoutineManager({items=[],working,mutate}){
 const [form,setForm]=useState(empty);
 const [selectedFile,setSelectedFile]=useState(null);
 const [filePreview,setFilePreview]=useState("");
 const [uploading,setUploading]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [fullImage,setFullImage]=useState("");
 const inputRef=useRef(null),editorRef=useRef(null);

 useEffect(()=>{
  if(!selectedFile){setFilePreview("");return}
  const objectUrl=URL.createObjectURL(selectedFile);
  setFilePreview(objectUrl);
  return ()=>URL.revokeObjectURL(objectUrl);
 },[selectedFile]);
 useEffect(()=>{
  if(!fullImage)return;
  const onKey=e=>{if(e.key==="Escape")setFullImage("")};
  window.addEventListener("keydown",onKey);
  return ()=>window.removeEventListener("keydown",onKey);
 },[fullImage]);

 function change(key,value){
  setNotice("");setForm(old=>{
   const next={...old,[key]:value};
   if(key==="grade" && value!=="9"&&value!=="10")next.group="all";
   return next;
  });
 }
 function pickFile(file){
  setError("");setNotice("");
  if(!file)return;
  if(!ACCEPT.includes(file.type)){setError("JPG, PNG বা WebP ছবি নির্বাচন করুন");return}
  if(file.size<64||file.size>MAX_SIZE){setError("ছবির আকার সর্বোচ্চ ৫ MB হতে হবে");return}
  setSelectedFile(file);
 }
 function reset(){
  setForm(empty());setSelectedFile(null);setError("");setNotice("");
  if(inputRef.current)inputRef.current.value="";
 }
 async function upload(){
  if(!selectedFile||uploading||working)return;
  setUploading(true);setError("");setNotice("");
  try{
   const user=firebaseAuth().currentUser;
   if(!user)throw Error("লগইন করে আবার চেষ্টা করুন");
   const token=await user.getIdToken();
   const body=new FormData();body.append("file",selectedFile);
   const response=await fetch("/api/routine-image",{method:"POST",headers:{Authorization:"Bearer "+token},body,cache:"no-store"});
   const data=await response.json().catch(()=>({}));
   if(!response.ok||!data.imageUrl)throw Error(data.error||"ছবি আপলোড ব্যর্থ হয়েছে");
   setForm(old=>({...old,imageUrl:data.imageUrl}));
   setSelectedFile(null);
   if(inputRef.current)inputRef.current.value="";
   setNotice("রুটিনের ছবি আপলোড হয়েছে। এখন নিচে সংরক্ষণ করুন।");
  }catch(e){setError(e.message)}
  finally{setUploading(false)}
 }
 async function save(){
  if(uploading||working)return;
  if(selectedFile){setError("আগে নির্বাচিত ছবিটি আপলোড করুন");return}
  setError("");setNotice("");
  if(!form.title.trim()){setError("রুটিনের নাম লিখুন");return}
  if(!form.imageUrl){setError("রুটিনের একটি ছবি আপলোড করুন");return}
  const result=await mutate("routine.save",form);
  if(result)reset();
 }
 function edit(item){
  setForm({id:item.id,title:item.title||"",kind:item.kind||"class",grade:String(item.grade||"all"),group:item.group||"all",imageUrl:item.imageUrl||"",published:!!item.published});
  setSelectedFile(null);setError("");setNotice("");
  if(inputRef.current)inputRef.current.value="";
  editorRef.current?.scrollIntoView({behavior:"smooth",block:"start"});
 }
 async function remove(item){
  if(!window.confirm("“"+item.title+"” রুটিনটি মুছে ফেলবেন?"))return;
  const result=await mutate("routine.delete",{id:item.id});
  if(result&&form.id===item.id)reset();
 }
 return <div className="routine-admin">
  <section className="panel routine-editor" ref={editorRef} aria-label="রুটিন সম্পাদনা">
   <header className="routine-admin-title"><span className="routine-admin-icon"><CalendarRange size={21}/></span>
    <div><h2>{form.id?"রুটিন সম্পাদনা":"নতুন রুটিন যোগ করুন"}</h2><p>শিক্ষার্থী ও অভিভাবকদের জন্য রুটিন প্রকাশ করুন</p></div>
    {form.id&&<button type="button" className="btn sm" onClick={reset}><X size={14}/> নতুন</button>}
   </header>
   <div className="routine-editor-body">
    <label className="field">রুটিনের নাম
     <input value={form.title} onChange={e=>change("title",e.target.value)} placeholder="যেমন: ৯ম শ্রেণির ক্লাস রুটিন" maxLength={140}/>
    </label>
    <div className="form-grid">
     <label className="field">ধরন
      <select value={form.kind} onChange={e=>change("kind",e.target.value)}>{types.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>
     </label>
     <label className="field">শ্রেণি
      <select value={form.grade} onChange={e=>change("grade",e.target.value)}>{grades.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>
     </label>
     {(form.grade==="9"||form.grade==="10")&&<label className="field">বিভাগ
      <select value={form.group} onChange={e=>change("group",e.target.value)}>{groups.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>
     </label>}
    </div>
    <div className="routine-uploader-block"><div className="routine-uploader-head"><strong>রুটিনের ছবি</strong><small>JPG, PNG বা WebP · সর্বোচ্চ ৫ MB</small></div>
     <div className={"routine-dropzone"+(filePreview?" has-file":"")} role="button" tabIndex={0} aria-label="রুটিনের ছবি নির্বাচন করুন"
      onClick={()=>inputRef.current?.click()}
      onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();inputRef.current?.click()}}}
      onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add("is-dragging")}}
      onDragLeave={e=>e.currentTarget.classList.remove("is-dragging")}
      onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove("is-dragging");pickFile(e.dataTransfer.files?.[0])}}>
      {filePreview||form.imageUrl?
       <div className="routine-upload-preview"><img src={filePreview||form.imageUrl} alt="নির্বাচিত রুটিনের ছবির প্রিভিউ"/>
        <span><ImagePlus size={16}/> ছবি পরিবর্তন করতে ক্লিক করুন</span></div>
       :<div className="routine-upload-empty"><span className="routine-upload-empty-icon"><CloudUpload size={29}/></span><b>ছবি নির্বাচন করুন অথবা এখানে ড্রপ করুন</b><small>পরিষ্কার ও পড়া যায় এমন রুটিনের ছবি দিন</small><span className="routine-upload-select"><ImagePlus size={15}/> ছবি বেছে নিন</span></div>}
     </div>
     <input className="routine-file-input" ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>pickFile(e.target.files?.[0])}/>
     {selectedFile&&<div className="routine-file-selected"><FileImage size={17}/><span>{selectedFile.name} · {toBanglaDigits((selectedFile.size/1024/1024).toFixed(2))} MB</span>
      <button type="button" aria-label="ছবি নির্বাচন বাতিল" onClick={()=>{setSelectedFile(null);if(inputRef.current)inputRef.current.value=""}}><X size={16}/></button></div>}
     {selectedFile&&<button className="btn primary routine-upload-action" type="button" disabled={uploading||working} onClick={upload}>
      <CloudUpload size={17}/>{uploading?"ImgBB-তে আপলোড হচ্ছে...":"ছবি আপলোড করুন"}</button>}
     {!selectedFile&&form.imageUrl&&<p className="routine-upload-ready"><CheckCircle2 size={15}/> ছবি প্রস্তুত — রুটিন সংরক্ষণ করা যাবে</p>}
    </div>
    {notice&&<p className="routine-feedback" role="status">{notice}</p>}
    {error&&<p className="alert error" role="alert">{error}</p>}
    <label className="routine-publish"><input type="checkbox" checked={form.published} onChange={e=>change("published",e.target.checked)}/>
     <span><b>ওয়েবসাইটে প্রকাশ করুন</b><small>প্রকাশিত রুটিন সবাই দেখতে পারবে</small></span></label>
    <div className="routine-form-actions"><button className="btn" type="button" onClick={reset} disabled={uploading||working}>বাতিল</button>
     <button className="btn primary" type="button" disabled={uploading||working||!!selectedFile||!form.imageUrl||!form.title.trim()} onClick={save}><Check size={16}/>{working?"সংরক্ষণ হচ্ছে...":form.id?"পরিবর্তন সংরক্ষণ":"রুটিন প্রকাশ / সংরক্ষণ"}</button>
    </div>
   </div>
  </section>
  <section className="routine-list-area">
   <div className="routine-list-head"><div><h2>সংরক্ষিত রুটিন</h2><p>নাম, ছবি ও প্রকাশনা নিয়ন্ত্রণ করুন</p></div><span className="chip">{toBanglaDigits(items.length)}টি</span></div>
   {!items.length?<div className="panel routine-empty-list"><FileImage size={29}/><b>এখনো কোনো রুটিন নেই</b><p>বাম পাশের ফর্ম থেকে রুটিন যোগ করুন।</p></div>:
    <div className="routine-cards">{items.map(item=><article className="panel routine-admin-card" key={item.id}>
     <button type="button" className="routine-card-thumb" onClick={()=>setFullImage(item.imageUrl)} aria-label={item.title+" বড় করে দেখুন"}>
      <img src={item.imageUrl} alt={item.title}/><ZoomIn size={16}/></button>
     <div className="routine-card-info"><div className="routine-card-tags"><span className={"chip "+(item.published?"":"gray")}>{item.published?"প্রকাশিত":"খসড়া"}</span><span className="chip gray">{item.kind==="exam"?"পরীক্ষার":"ক্লাস"} রুটিন</span></div>
      <h3>{item.title}</h3><p>{routineGradeLabel(item.grade,item.group)}</p>
      <div className="routine-card-actions"><button type="button" className="btn sm" onClick={()=>edit(item)}><Pencil size={15}/> এডিট</button>
       <button type="button" className="btn sm danger" disabled={working} onClick={()=>remove(item)}><Trash2 size={15}/> ডিলিট</button></div>
     </div>
    </article>)}</div>}
  </section>
  {fullImage&&<div className="routine-full-backdrop" onClick={()=>setFullImage("")} role="presentation"><div className="routine-full-modal" role="dialog" aria-modal="true" aria-label="রুটিনের সম্পূর্ণ ছবি" onClick={e=>e.stopPropagation()}>
   <button type="button" className="routine-full-close" onClick={()=>setFullImage("")} aria-label="ছবি বন্ধ করুন"><X size={20}/></button><img src={fullImage} alt="সম্পূর্ণ রুটিন"/>
  </div></div>}
 </div>;
}
