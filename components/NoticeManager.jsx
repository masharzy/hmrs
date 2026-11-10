"use client";
import { useRef, useState } from "react";
import { firebaseAuth } from "../lib/firebase-client";
import { Bell, FileDown, ImagePlus, Pencil, Send, Trash2, X } from "lucide-react";

const blank=()=>({title:"",message:"",published:true,imageUrl:"",pdfUrl:"",pdfName:""});
const maxImage=3*1024*1024, maxPdf=4*1024*1024;

export default function NoticeManager({items=[],working,mutate}){
 const [form,setForm]=useState(blank),[editId,setEditId]=useState("");
 const [image,setImage]=useState(null),[pdf,setPdf]=useState(null),[uploading,setUploading]=useState(false),[error,setError]=useState("");
 const imageInput=useRef(null),pdfInput=useRef(null);
 const change=(key,value)=>setForm(previous=>({...previous,[key]:value}));
 const reset=()=>{setForm(blank());setEditId("");setImage(null);setPdf(null);setError("");
  if(imageInput.current)imageInput.current.value="";
  if(pdfInput.current)pdfInput.current.value="";};
 const pick=(kind,file)=>{
  setError("");
  if(!file){kind==="image"?setImage(null):setPdf(null);return}
  if(kind==="image"){
   if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>maxImage||file.size<64){
    setError("শুধু JPG, PNG বা WebP ছবি (সর্বোচ্চ ৩ MB) দিন");return}
   setImage(file);
  }else{
   if(file.type&&file.type!=="application/pdf"||file.size>maxPdf||file.size<20){
    setError("শুধু PDF ফাইল (সর্বোচ্চ ৪ MB) দিন");return}
   setPdf(file);
  }
 };
 async function upload(kind,file){
  const token=await firebaseAuth().currentUser?.getIdToken();
  if(!token)throw Error("লগইন প্রয়োজন");
  const formData=new FormData();formData.append("kind",kind);formData.append("file",file);
  const response=await fetch("/api/notice-attachment",{
   method:"POST",headers:{Authorization:"Bearer "+token},body:formData,cache:"no-store"
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.url)throw Error(result.error||"সংযুক্ত ফাইল আপলোড করা যায়নি");
  return result.url;
 }
 async function save(){
  if(uploading||working)return;
  if(!form.title.trim()||!form.message.trim()){setError("শিরোনাম এবং বিবরণ দিন");return}
  setUploading(true);setError("");
  try{
   const [imageUrl,pdfUrl]=await Promise.all([
    image?upload("image",image):Promise.resolve(form.imageUrl),
    pdf?upload("pdf",pdf):Promise.resolve(form.pdfUrl)
   ]);
   const result=await mutate("notice.save",{...form,id:editId||undefined,imageUrl,pdfUrl,pdfName:pdf?.name||form.pdfName});
   if(result)reset();
  }catch(e){setError(e.message||"ফাইল আপলোড করা যায়নি")}
  finally{setUploading(false)}
 }
 function edit(item){
  setEditId(item.id);
  setForm({title:item.title||"",message:item.message||"",published:!!item.published,
   imageUrl:item.imageUrl||"",pdfUrl:item.pdfUrl||"",pdfName:item.pdfName||""});
  setImage(null);setPdf(null);setError("");
  window.scrollTo({top:0,behavior:"smooth"});
 }
 return <div className="hmrs-notice-manager">
  <section className="panel p-5 grid gap-3">
   <div className="flex items-center justify-between gap-2"><h2 className="section-title">{editId?"নোটিশ সম্পাদনা":"নতুন নোটিশ"}</h2>
    {editId&&<button className="btn sm" type="button" onClick={reset}><X size={15}/> নতুন নোটিশ</button>}</div>
   <label className="field">নোটিশের শিরোনাম <input value={form.title} maxLength={170} onChange={e=>change("title",e.target.value)} required/></label>
   <label className="field">নোটিশের বিবরণ <textarea rows={5} maxLength={3000} value={form.message} onChange={e=>change("message",e.target.value)} required/></label>
   <div className="hmrs-notice-files">
    <label className="field"><span className="flex items-center gap-2"><ImagePlus size={16}/> ছবি (ঐচ্ছিক)</span>
     <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>pick("image",e.target.files?.[0])}/>
     <small>JPG, PNG বা WebP · সর্বোচ্চ ৩ MB</small></label>
    <label className="field"><span className="flex items-center gap-2"><FileDown size={16}/> PDF (ঐচ্ছিক)</span>
     <input ref={pdfInput} type="file" accept=".pdf,application/pdf" onChange={e=>pick("pdf",e.target.files?.[0])}/>
     <small>PDF · সর্বোচ্চ ৪ MB · Cloudflare R2</small></label>
   </div>
   {(image||form.imageUrl||pdf||form.pdfUrl)&&<div className="hmrs-notice-selection">
    {(image||form.imageUrl)&&<span>📷 {image?.name||"সংযুক্ত ছবি"} <button type="button" onClick={()=>{setImage(null);change("imageUrl","");if(imageInput.current)imageInput.current.value=""}} aria-label="ছবি বাদ দিন"><X size={14}/></button></span>}
    {(pdf||form.pdfUrl)&&<span>📄 {pdf?.name||form.pdfName||"সংযুক্ত PDF"} <button type="button" onClick={()=>{setPdf(null);setForm(old=>({...old,pdfUrl:"",pdfName:""}));if(pdfInput.current)pdfInput.current.value=""}} aria-label="PDF বাদ দিন"><X size={14}/></button></span>}
   </div>}
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={e=>change("published",e.target.checked)}/> ওয়েবসাইটে প্রকাশ করুন</label>
   {error&&<p className="alert error" role="alert">{error}</p>}
   <button type="button" className="btn primary justify-self-start" disabled={working||uploading||!form.title.trim()||!form.message.trim()} onClick={save}>
    <Send size={16}/>{uploading?"ফাইল আপলোড হচ্ছে...":working?"সংরক্ষণ হচ্ছে...":editId?"পরিবর্তন সংরক্ষণ":"নোটিশ সংরক্ষণ"}</button>
  </section>
  <section className="grid gap-2 mt-5"><h2 className="section-title">প্রকাশিত ও খসড়া নোটিশ</h2>
   {items.map(item=><div key={item.id} className="panel p-4 hmrs-notice-admin-row">
    <div><b>{item.title}</b><p className="muted text-xs mt-1 mb-0">{item.message}</p>
     <div className="hmrs-notice-status">{item.published?"প্রকাশিত":"খসড়া"}{item.imageUrl?" · ছবি":""}{item.pdfUrl?" · PDF":""}</div></div>
    <div className="inline-actions"><button type="button" className="btn sm" onClick={()=>edit(item)}><Pencil size={14}/> এডিট</button>
     <button type="button" className="btn sm danger" disabled={working||uploading} onClick={()=>{if(confirm("নোটিশটি মুছে ফেলবেন?"))mutate("notice.delete",{id:item.id})}}><Trash2 size={14}/> মুছুন</button></div>
   </div>)}
   {!items.length&&<p className="panel empty">এখনো কোনো নোটিশ নেই</p>}
  </section>
 </div>;
}
