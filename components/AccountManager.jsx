"use client";
import { useEffect, useState } from "react";
import { Pencil, Trash2, X, AlertTriangle, UserPlus, Search } from "lucide-react";
import { toBanglaDigits } from "../lib/bangla-numbers";
import { CLASS_OPTIONS, TEACHER_SUBJECT_OPTIONS } from "../lib/teacher-subjects";
import PinInput from "./PinInput";

const roles={teacher:"শিক্ষক",class_teacher:"শ্রেণি শিক্ষক"};
const empty=()=>({name:"",phone:"",pin:"",roles:["teacher"],teachingClasses:[],classTeacherClasses:[],teachingSubjects:[],active:true});
function Choices({label,options,values,onChange}){
 return <fieldset className="hmrs-teacher-choices"><legend>{label}</legend><div className="hmrs-teacher-choice-grid">
  {options.map(option=><label key={option.value||option.id} className={values.includes(option.value||option.id)?"selected":""}>
   <input type="checkbox" checked={values.includes(option.value||option.id)}
    onChange={e=>onChange(e.target.checked?[...values,option.value||option.id]:values.filter(v=>v!==(option.value||option.id)))}/>
   {option.label||option.name}
  </label>)}
 </div></fieldset>;
}
export default function AccountManager({actor,request,mutate,working,error}){
 const [search,setSearch]=useState(""),[debounced,setDebounced]=useState("");
 const [page,setPage]=useState(1),[items,setItems]=useState([]),[total,setTotal]=useState(0);
 const [loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
 const [modal,setModal]=useState(null),[values,setValues]=useState(empty),[localError,setLocalError]=useState("");
 useEffect(()=>{const timer=setTimeout(()=>{setDebounced(search.trim());setPage(1)},280);return()=>clearTimeout(timer)},[search]);
 useEffect(()=>{
  let active=true;setLoading(true);
  request("staff.accounts",{params:"page="+page+"&q="+encodeURIComponent(debounced)})
   .then(response=>{if(active){setItems(response.items||[]);setTotal(response.total||0)}})
   .catch(e=>{if(active)setLocalError(e.message)})
   .finally(()=>{if(active)setLoading(false)});
  return ()=>{active=false};
 // request is a parent function; fetch only when inputs change.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[page,debounced,revision]);
 const maxPage=Math.max(1,Math.ceil(total/20));
 function openCreate(){setModal({kind:"create"});setValues(empty());setLocalError("")}
 function openEdit(user){
  setModal({kind:"edit",user});setLocalError("");
  const roles=user.roles||[user.role];
  setValues({name:user.name||"",phone:user.phone||"",pin:"",roles,
   teachingClasses:roles.includes("teacher")?(user.teachingClasses||user.assignedClasses||[]).map(String):[],
   classTeacherClasses:roles.includes("class_teacher")?(user.classTeacherClasses||user.assignedClasses||[]).map(String):[],
   teachingSubjects:(user.teachingSubjects||[]).map(String),active:user.active!==false});
 }
 function close(){if(working)return;setModal(null);setLocalError("")}
 function changed(key,value){setValues(v=>({...v,[key]:value}));setLocalError("")}
 async function submit(e){
  e.preventDefault();if(working)return;setLocalError("");
  if(!values.name.trim()||!values.phone.trim()){setLocalError("শিক্ষকের নাম ও মোবাইল নম্বর দিন");return}
  if(!values.roles.length){setLocalError("অন্তত একটি ভূমিকা নির্বাচন করুন");return}
  if(values.roles.includes("teacher")&&!values.teachingClasses.length){setLocalError("যে শ্রেণিতে পড়ান নির্বাচন করুন");return}
  if(values.roles.includes("class_teacher")&&!values.classTeacherClasses.length){setLocalError("শ্রেণি শিক্ষক হিসেবে শ্রেণি নির্বাচন করুন");return}
  if(values.teachingSubjects.length===0){setLocalError("শিক্ষকের অন্তত একটি বিষয় নির্বাচন করুন");return}
  if(modal.kind==="create"&&!/^\d{5}$/.test(values.pin)){setLocalError("পাঁচ সংখ্যার PIN দিন");return}
  if(modal.kind==="edit"&&values.pin&&!/^\d{5}$/.test(values.pin)){setLocalError("পাঁচ সংখ্যার PIN দিন");return}
  const r=modal.kind==="create"
   ?await mutate("account.create",values)
   :await mutate("account.update",{uid:modal.user.id,values});
  if(r){setModal(null);setRevision(n=>n+1)}
 }
 async function remove(){
  if(working)return;
  const r=await mutate("account.delete",{uid:modal.user.id,confirmed:true});
  if(r){setModal(null);setPage(1);setRevision(n=>n+1)}
 }
 return <section className="hmrs-accounts">
  <div className="hmrs-accounts-toolbar">
   <div><h2 className="section-title">শিক্ষক ব্যবস্থাপনা</h2><p className="muted text-xs">শুধু শিক্ষক ও শ্রেণি শিক্ষক; শিক্ষার্থীরা শিক্ষার্থী বিভাগে থাকবে।</p></div>
   <div className="hmrs-accounts-actions"><label className="field"><span className="sr-only">শিক্ষক খুঁজুন</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="নাম বা মোবাইল দিয়ে খুঁজুন"/></label>
    <button className="btn primary" type="button" onClick={openCreate}><UserPlus size={16}/> শিক্ষক যুক্ত করুন</button></div>
  </div>
  <div className="panel table-wrap"><table><thead><tr><th>ক্রমিক</th><th>নাম</th><th>মোবাইল</th><th>ভূমিকা</th><th>শ্রেণি</th><th>বিষয়</th><th>ব্যবস্থা</th></tr></thead><tbody>
   {!loading&&items.map((u,i)=><tr key={u.id}><td>{toBanglaDigits((page-1)*20+i+1)}</td>
    <td className="font-bold">{u.name}{u.active===false&&<span className="chip gray ml-2">নিষ্ক্রিয়</span>}</td>
    <td>{toBanglaDigits(u.phone||"—")}</td><td>{(u.roles||[u.role]).map(r=>roles[r]).filter(Boolean).join(" + ")}</td>
    <td>{[...new Set([...(u.teachingClasses||[]),...(u.classTeacherClasses||[]),...(u.assignedClasses||[])])].map(toBanglaDigits).join(", ")||"—"}</td>
    <td className="hmrs-teacher-subject-summary">{(u.teachingSubjects||[]).map(id=>TEACHER_SUBJECT_OPTIONS.find(s=>s.id===id)?.name||id).join(", ")||"—"}</td>
    <td><div className="inline-actions"><button className="btn sm" type="button" onClick={()=>openEdit(u)}><Pencil size={14}/> এডিট</button>
     <button className="btn sm danger" type="button" onClick={()=>{setLocalError("");setModal({kind:"delete",user:u})}}><Trash2 size={14}/> ডিলিট</button></div></td>
   </tr>)}
  </tbody></table>{loading?<p className="empty">শিক্ষকদের তথ্য লোড হচ্ছে...</p>:!items.length&&<p className="empty">কোনো শিক্ষক পাওয়া যায়নি।</p>}</div>
  <div className="hmrs-sheet-bottom"><span>{toBanglaDigits(total)} জন শিক্ষক · পৃষ্ঠা {toBanglaDigits(page)} / {toBanglaDigits(maxPage)}</span>
   <div className="inline-actions"><button className="btn sm" disabled={page<=1||loading} onClick={()=>setPage(p=>p-1)}>আগের</button>
    <button className="btn sm" disabled={page>=maxPage||loading} onClick={()=>setPage(p=>p+1)}>পরের</button></div>
  </div>
  {modal&&<div className="record-modal-backdrop">
   {modal.kind==="delete"?<section className="record-modal record-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="teacher-delete-title">
    <div className="record-modal-head"><h2 id="teacher-delete-title"><AlertTriangle size={19}/> শিক্ষক ডিলিট করবেন?</h2><button className="btn sm" type="button" onClick={close} disabled={working}><X size={17}/></button></div>
    <div className="record-modal-body"><p><b>{modal.user.name}</b>-এর শিক্ষক অ্যাকাউন্ট স্থায়ীভাবে ডিলিট হবে।</p>{(localError||error)&&<p className="alert error">{localError||error}</p>}</div>
    <div className="record-modal-actions"><button className="btn" type="button" disabled={working} onClick={close}>বাতিল</button>
     <button className="btn danger" type="button" disabled={working} onClick={remove}>{working?"ডিলিট হচ্ছে...":"নিশ্চিত, ডিলিট করুন"}</button></div>
   </section>:<section className="record-modal hmrs-teacher-modal" role="dialog" aria-modal="true" aria-labelledby="teacher-modal-title">
    <div className="record-modal-head"><div><h2 id="teacher-modal-title">{modal.kind==="create"?"শিক্ষক যুক্ত করুন":"শিক্ষকের তথ্য এডিট"}</h2><p className="muted text-xs">শিক্ষক ও শ্রেণি শিক্ষক—এক বা দুই ভূমিকা, আলাদা শ্রেণি ও পাঠদানের বিষয় নির্বাচন করুন</p></div>
     <button type="button" className="btn sm" onClick={close} disabled={working} aria-label="বন্ধ করুন"><X size={18}/></button></div>
    <form onSubmit={submit}><div className="record-modal-body">
     {(localError||error)&&<p role="alert" className="alert error">{localError||error}</p>}
     <div className="form-grid">
      <label className="field">শিক্ষকের নাম<input value={values.name} onChange={e=>changed("name",e.target.value)} required maxLength={120}/></label>
      <label className="field">লগইন মোবাইল<input type="tel" value={values.phone} onChange={e=>changed("phone",e.target.value)} required/></label>
      <div className="field"><span>ভূমিকা</span><Choices label="একাধিক ভূমিকা নির্বাচন করতে পারবেন" options={[{value:"teacher",label:"শিক্ষক"},{value:"class_teacher",label:"শ্রেণি শিক্ষক"}]}
         values={values.roles} onChange={v=>changed("roles",v)}/></div>
      <div className="field"><PinInput label={modal.kind==="create"?"পাঁচ সংখ্যার PIN":"নতুন PIN (পরিবর্তন না হলে খালি রাখুন)"} value={values.pin} onChange={v=>changed("pin",v)}/></div>
     </div>
     {values.roles.includes("teacher")&&<Choices label="শিক্ষক হিসেবে যে শ্রেণিগুলোতে পড়ান" options={CLASS_OPTIONS}
       values={values.teachingClasses} onChange={v=>changed("teachingClasses",v)}/>}
     {values.roles.includes("class_teacher")&&<Choices label="যে শ্রেণিগুলোর শ্রেণি শিক্ষক" options={CLASS_OPTIONS}
       values={values.classTeacherClasses} onChange={v=>changed("classTeacherClasses",v)}/>} 
     <Choices label="যে যে বিষয়ের শিক্ষক" options={TEACHER_SUBJECT_OPTIONS} values={values.teachingSubjects} onChange={v=>changed("teachingSubjects",v)}/>
     {modal.kind==="edit"&&<label className="hmrs-account-active"><input type="checkbox" checked={values.active} onChange={e=>changed("active",e.target.checked)}/> অ্যাকাউন্ট সক্রিয়</label>}
    </div><div className="record-modal-actions"><button type="button" className="btn" disabled={working} onClick={close}>বাতিল</button>
     <button className="btn primary" disabled={working} type="submit">{working?"সংরক্ষণ হচ্ছে...":modal.kind==="create"?"শিক্ষক যুক্ত করুন":"পরিবর্তন সংরক্ষণ"}</button></div></form>
   </section>}
  </div>}
 </section>;
}
