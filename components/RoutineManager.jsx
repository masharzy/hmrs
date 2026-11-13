"use client";
import { useEffect, useRef, useState } from "react";
import { firebaseAuth } from "../lib/firebase-client";
import { toAsciiDigits } from "../lib/bangla-numbers";
import { routineGradeLabel } from "../lib/routines";
import { CalendarRange, Check, CheckCircle2, CloudUpload, FileImage, ImagePlus, Pencil, Trash2, X, ZoomIn } from "lucide-react";

const types=[["class","Class Routine"],["exam","Exam Routine"]];
const grades=[["all","All Classes"],["6","Class 6"],["7","Class 7"],["8","Class 8"],["9","Class 9"],["10","Class 10"]];
const groups=[["all","All Groups"],["science","Science"],["business","Business Studies"],["humanities","Humanities"]];
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
  if(!ACCEPT.includes(file.type)){setError("Choose a JPG, PNG or WebP image");return}
  if(file.size<64||file.size>MAX_SIZE){setError("Image size must not exceed 5 MB");return}
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
   if(!user)throw Error("Sign in and try again");
   const token=await user.getIdToken();
   const body=new FormData();body.append("file",selectedFile);
   const response=await fetch("/api/routine-image",{method:"POST",headers:{Authorization:"Bearer "+token},body,cache:"no-store"});
   const data=await response.json().catch(()=>({}));
   if(!response.ok||!data.imageUrl)throw Error(data.error||"Image upload failed");
   setForm(old=>({...old,imageUrl:data.imageUrl}));
   setSelectedFile(null);
   if(inputRef.current)inputRef.current.value="";
   setNotice("Routine image uploaded.");
   return data.imageUrl;
  }catch(e){setError(e.message)}
  finally{setUploading(false)}
 }
 async function save(){
  if(uploading||working)return;
  setError("");setNotice("");
  if(!form.title.trim()){setError("Enter a routine title");return}
  // A single Save click uploads an optional new image and persists metadata.
  const imageUrl=selectedFile?await upload():form.imageUrl;
  if(!imageUrl){if(!selectedFile)setError("Upload a routine image");return}
  const result=await mutate("routine.save",{...form,imageUrl});
  if(result)reset();
 }
 function edit(item){
  setForm({id:item.id,title:item.title||"",kind:item.kind||"class",grade:String(item.grade||"all"),group:item.group||"all",imageUrl:item.imageUrl||"",published:!!item.published});
  setSelectedFile(null);setError("");setNotice("");
  if(inputRef.current)inputRef.current.value="";
  editorRef.current?.scrollIntoView({behavior:"smooth",block:"start"});
 }
 async function remove(item){
  if(!window.confirm("“"+item.title+"” routine?"))return;
  const result=await mutate("routine.delete",{id:item.id});
  if(result&&form.id===item.id)reset();
 }
 return <div className="routine-admin">
  <section className="panel routine-editor" ref={editorRef} aria-label="Edit Routine">
   <header className="routine-admin-title"><span className="routine-admin-icon"><CalendarRange size={21}/></span>
    <div><h2>{form.id?"Edit Routine":"Add Routine"}</h2><p>Publish routines for students and guardians</p></div>
    {form.id&&<button type="button" className="btn sm" onClick={reset}><X size={14}/> New</button>}
   </header>
   <div className="routine-editor-body">
    <label className="field">Routine Title
     <input value={form.title} onChange={e=>change("title",e.target.value)} placeholder="Example: Class 9 Routine" maxLength={140}/>
    </label>
    <div className="form-grid">
     <label className="field">Type
      <select value={form.kind} onChange={e=>change("kind",e.target.value)}>{types.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>
     </label>
     <label className="field">Class
      <select value={form.grade} onChange={e=>change("grade",e.target.value)}>{grades.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>
     </label>
     {(form.grade==="9"||form.grade==="10")&&<label className="field">Group
      <select value={form.group} onChange={e=>change("group",e.target.value)}>{groups.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>
     </label>}
    </div>
    <div className="routine-uploader-block"><div className="routine-uploader-head"><strong>Routine Image</strong><small>JPG, PNG বা WebP · সর্বোচ্চ ৫ MB</small></div>
     <div className={"routine-dropzone"+(filePreview?" has-file":"")} role="button" tabIndex={0} aria-label="Choose routine image"
      onClick={()=>inputRef.current?.click()}
      onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();inputRef.current?.click()}}}
      onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add("is-dragging")}}
      onDragLeave={e=>e.currentTarget.classList.remove("is-dragging")}
      onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove("is-dragging");pickFile(e.dataTransfer.files?.[0])}}>
      {filePreview||form.imageUrl?
       <div className="routine-upload-preview"><img src={filePreview||form.imageUrl} alt="Routine image preview"/>
        <span><ImagePlus size={16}/> Click to change image</span></div>
       :<div className="routine-upload-empty"><span className="routine-upload-empty-icon"><CloudUpload size={29}/></span><b>Select an image or drop it here</b><small>Use a clear, readable image</small><span className="routine-upload-select"><ImagePlus size={15}/> image বেছে নিন</span></div>}
     </div>
     <input className="routine-file-input" ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>pickFile(e.target.files?.[0])}/>
     {selectedFile&&<div className="routine-file-selected"><FileImage size={17}/><span>{selectedFile.name} · {toAsciiDigits((selectedFile.size/1024/1024).toFixed(2))} MB</span>
      <button type="button" aria-label="Cancel image selection" onClick={()=>{setSelectedFile(null);if(inputRef.current)inputRef.current.value=""}}><X size={16}/></button></div>}
     {selectedFile&&<button className="btn primary routine-upload-action" type="button" disabled={uploading||working} onClick={upload}>
      <CloudUpload size={17}/>{uploading?"Uploading to ImgBB…":"Upload Image"}</button>}
     {!selectedFile&&form.imageUrl&&<p className="routine-upload-ready"><CheckCircle2 size={15}/> Image ready — routine can be saved</p>}
    </div>
    {notice&&<p className="routine-feedback" role="status">{notice}</p>}
    {error&&<p className="alert error" role="alert">{error}</p>}
    <label className="routine-publish"><input type="checkbox" checked={form.published} onChange={e=>change("published",e.target.checked)}/>
     <span><b>Publish on Website</b><small>Everyone can view published routines</small></span></label>
    <div className="routine-form-actions"><button className="btn" type="button" onClick={reset} disabled={uploading||working}>Cancel</button>
     <button className="btn primary" type="button" disabled={uploading||working||(!selectedFile&&!form.imageUrl)||!form.title.trim()} onClick={save}><Check size={16}/>{working?"Saving…":selectedFile?"Upload & Save":form.id?"Save Changes":"Publish / Save Routine"}</button>
    </div>
   </div>
  </section>
  <section className="routine-list-area">
   <div className="routine-list-head"><div><h2>Saved Routines</h2><p>Manage titles, images and publication status</p></div><span className="chip">{toAsciiDigits(items.length)}টি</span></div>
   {!items.length?<div className="panel routine-empty-list"><FileImage size={29}/><b>No routines saved</b><p>Add a routine using the form above.</p></div>:
    <div className="routine-cards">{items.map(item=><article className="panel routine-admin-card" key={item.id}>
     <button type="button" className="routine-card-thumb" onClick={()=>setFullImage(item.imageUrl)} aria-label={item.title+" View full size"}>
      <img src={item.imageUrl} alt={item.title}/><ZoomIn size={16}/></button>
     <div className="routine-card-info"><div className="routine-card-tags"><span className={"chip "+(item.published?"":"gray")}>{item.published?"Published":"Draft"}</span><span className="chip gray">{item.kind==="exam"?"Exam":"Class"} রুটিন</span></div>
      <h3>{item.title}</h3><p>{routineGradeLabel(item.grade,item.group)}</p>
      <div className="routine-card-actions"><button type="button" className="btn sm" onClick={()=>edit(item)}><Pencil size={15}/> Edit</button>
       <button type="button" className="btn sm danger" disabled={working} onClick={()=>remove(item)}><Trash2 size={15}/> Delete</button></div>
     </div>
    </article>)}</div>}
  </section>
  {fullImage&&<div className="routine-full-backdrop" onClick={()=>setFullImage("")} role="presentation"><div className="routine-full-modal" role="dialog" aria-modal="true" aria-label="রুটিনের সম্পূর্ণ image" onClick={e=>e.stopPropagation()}>
   <button type="button" className="routine-full-close" onClick={()=>setFullImage("")} aria-label="ছবি বন্ধ করুন"><X size={20}/></button><img src={fullImage} alt="সম্পূর্ণ রুটিন"/>
  </div></div>}
 </div>;
}
