"use client";
import { useEffect, useState } from "react";
import { Pencil, Trash2, X, AlertTriangle, UserPlus, Search, Check, BookOpen, Users, Upload, UserRound, KeyRound } from "lucide-react";
import { firebaseAuth } from "../lib/firebase-client";
import { toAsciiDigits } from "../lib/bangla-numbers";
import { CLASS_OPTIONS, TEACHER_SUBJECT_OPTIONS } from "../lib/teacher-subjects";
import {enSubject} from "../lib/result-english.js";
const EN_CLASSES=CLASS_OPTIONS.map(option=>({...option,label:"Class "+option.value}));
const EN_SUBJECTS=TEACHER_SUBJECT_OPTIONS.map(option=>({...option,name:enSubject(option.id,option.name)}));
import PinInput from "./PinInput";

const roles={teacher:"বিষয় শিক্ষক",class_teacher:"শ্রেণি শিক্ষক",assistant_principal:"সহকারী প্রধান শিক্ষক",staff_manager:"স্টাফ ম্যানেজার"};
const empty=()=>({name:"",phone:"",pin:"",roles:["teacher"],teachingClasses:[],classTeacherClasses:[],teachingSubjects:[],photoUrl:"",active:true});
function Choices({label,options,values,onChange,kind="classes",description="",searchable=false}){
 const [query,setQuery]=useState("");
 const filtered=searchable?options.filter(o=>(o.label||o.name||"").toLowerCase().includes(query.trim().toLowerCase())):options;
 const toggle=value=>onChange(values.includes(value)?values.filter(v=>v!==value):[...values,value]);
 return <section className={"hmrs-teacher-picker hmrs-teacher-picker-"+kind} aria-label={kind==="roles"?"Teacher Roles":label}>
  <div className="hmrs-teacher-picker-heading"><div><h3>{label}</h3>{description&&<p>{description}</p>}</div>
   <span className="hmrs-teacher-selected-count">{toAsciiDigits(values.length)} selected</span></div>
  {searchable&&<div className="hmrs-teacher-picker-search"><Search size={15}/><input type="search" aria-label={label+" search"}
   placeholder="Search subjects" value={query} onChange={e=>setQuery(e.target.value)}/></div>}
  <div className="hmrs-teacher-picker-grid">
   {filtered.map(option=>{
    const id=option.value||option.id,chosen=values.includes(id);
    return <button type="button" aria-pressed={chosen} key={id} onClick={()=>toggle(id)}
     className={"hmrs-teacher-option "+(chosen?"is-selected":"")}>
      <span className="hmrs-teacher-option-check"><Check size={13}/></span>
      <span className="hmrs-teacher-option-label"><b>{option.label||option.name}</b>
       {option.description&&<small>{option.description}</small>}</span>
     </button>;
   })}
   {!filtered.length&&<p className="hmrs-teacher-no-match">No matching subjects found.</p>}
  </div>
 </section>;
}
export default function AccountManager({actor,request,mutate,working,error}){
 const [search,setSearch]=useState(""),[debounced,setDebounced]=useState("");
 const [page,setPage]=useState(1),[items,setItems]=useState([]),[total,setTotal]=useState(0);
 const [loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
 const [modal,setModal]=useState(null),[values,setValues]=useState(empty),[localError,setLocalError]=useState("");
 const [photoBusy,setPhotoBusy]=useState(false);
 const [resetPin,setResetPin]=useState("");
 const [resetBusy,setResetBusy]=useState(false);
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
   teachingSubjects:(user.teachingSubjects||[]).map(String),photoUrl:user.photoUrl||"",active:user.active!==false});
 }
 function close(){if(working||photoBusy||resetBusy)return;setModal(null);setLocalError("");setResetPin("")}
 async function resetStaffPin(e){
  e.preventDefault();if(!modal||modal.kind!=="reset"||resetPin.length!==5||resetBusy)return;
  setResetBusy(true);setLocalError("");
  try{
   const user=firebaseAuth().currentUser;if(!user)throw Error("আবার লগইন করুন");
   const token=await user.getIdToken();
   const response=await fetch("/api/account-reset",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({uid:modal.user.id,pin:resetPin})});
   const output=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(output.error||"PIN রিসেট করা যায়নি");
   setModal(null);setResetPin("");setLocalError("");
   window.alert(modal.user.name+"-এর নতুন PIN সফলভাবে সেট হয়েছে। পুরোনো সেশন বাতিল করা হয়েছে।");
  }catch(e){setLocalError(e.message)}
  finally{setResetBusy(false)}
 }
 function changed(key,value){setValues(v=>({...v,[key]:value}));setLocalError("")}
 async function uploadPhoto(file){
  if(!file)return;
  setLocalError("");
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>3*1024*1024){setLocalError("Choose a JPG, PNG or WebP photo up to 3 MB");return}
  setPhotoBusy(true);
  try{
   const body=new FormData();body.append("file",file);
   const token=await firebaseAuth().currentUser.getIdToken();
   const response=await fetch("/api/staff-photo",{method:"POST",headers:{Authorization:"Bearer "+token},body});
   const output=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(output.error||"Photo upload failed");
   changed("photoUrl",output.photoUrl);
  }catch(e){setLocalError(e.message)}finally{setPhotoBusy(false)}
 }
 async function submit(e){
  e.preventDefault();if(working)return;setLocalError("");
  if(values.photoUrl&&!/^https:\/\/[^\s]+$/i.test(values.photoUrl)){setLocalError("Enter a valid HTTPS photo URL");return}
   if(!values.name.trim()||!values.phone.trim()){setLocalError("Enter teacher name and phone number");return}
  if(!values.roles.length){setLocalError("Select at least one role");return}
  const privileged=values.roles.some(r=>["assistant_principal","staff_manager"].includes(r));
  if(privileged&&(values.roles.length!==1||modal.kind!=="create")){setLocalError("প্রশাসনিক ভূমিকা আলাদা অ্যাকাউন্ট হিসেবে তৈরি করুন");return}
  if(!privileged&&values.roles.includes("teacher")&&!values.teachingClasses.length){setLocalError("Select the classes this teacher teaches");return}
  if(!privileged&&values.roles.includes("class_teacher")&&!values.classTeacherClasses.length){setLocalError("Select the homeroom classes");return}
  if(!privileged&&values.teachingSubjects.length===0){setLocalError("Select at least one teaching subject");return}
  if(modal.kind==="create"&&!/^\d{5}$/.test(values.pin)){setLocalError("Enter a 5-digit PIN");return}
  if(modal.kind==="edit"&&values.pin&&!/^\d{5}$/.test(values.pin)){setLocalError("Enter a 5-digit PIN");return}
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
   <div><h2 className="section-title">Teacher Management</h2><p className="muted text-xs">Manage teacher and class teacher accounts. Student accounts are listed under Students.</p></div>
   <div className="hmrs-accounts-actions"><label className="field"><span className="sr-only">Search Teachers</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or phone"/></label>
    <button className="btn primary" type="button" onClick={openCreate}><UserPlus size={16}/> Add Teacher</button></div>
  </div>
  <div className="panel table-wrap"><table><thead><tr><th>No.</th><th>Name</th><th>Phone</th><th>Role</th><th>Classes</th><th>Subjects</th><th>Actions</th></tr></thead><tbody>
   {!loading&&items.map((u,i)=><tr key={u.id}><td>{toAsciiDigits((page-1)*20+i+1)}</td>
    <td className="font-bold"><span className="inline-flex items-center gap-2">{u.photoUrl&&<img src={u.photoUrl} alt="" style={{width:34,height:34,objectFit:"cover",borderRadius:"50%"}}/>}{u.name}</span>{u.active===false&&<span className="chip gray ml-2">Inactive</span>}</td>
    <td>{toAsciiDigits(u.phone||"—")}</td><td>{(u.roles||[u.role]).map(r=>roles[r]).filter(Boolean).join(" + ")}</td>
    <td>{[...new Set([...(u.teachingClasses||[]),...(u.classTeacherClasses||[]),...(u.assignedClasses||[])])].map(toAsciiDigits).join(", ")||"—"}</td>
    <td className="hmrs-teacher-subject-summary">{(u.teachingSubjects||[]).map(id=>enSubject(id,TEACHER_SUBJECT_OPTIONS.find(s=>s.id===id)?.name)||id).join(", ")||"—"}</td>
    <td><div className="inline-actions"><button className="btn sm" type="button" onClick={()=>openEdit(u)}><Pencil size={14}/> Edit</button>
     <button className="btn sm" type="button" onClick={()=>{setLocalError("");setResetPin("");setModal({kind:"reset",user:u})}}><KeyRound size={14}/> PIN Reset</button>
     <button className="btn sm danger" type="button" onClick={()=>{setLocalError("");setModal({kind:"delete",user:u})}}><Trash2 size={14}/> Delete</button></div></td>
   </tr>)}
  </tbody></table>{loading?<p className="empty">Loading teachers…</p>:!items.length&&<p className="empty">No teachers found.</p>}</div>
  <div className="hmrs-sheet-bottom"><span>{toAsciiDigits(total)} teachers · Page {toAsciiDigits(page)} / {toAsciiDigits(maxPage)}</span>
   <div className="inline-actions"><button className="btn sm" disabled={page<=1||loading} onClick={()=>setPage(p=>p-1)}>Previous</button>
    <button className="btn sm" disabled={page>=maxPage||loading} onClick={()=>setPage(p=>p+1)}>Next</button></div>
  </div>
  {modal&&<div className="record-modal-backdrop">
   {modal.kind==="reset"?<section className="record-modal record-delete-modal" role="dialog" aria-modal="true" aria-labelledby="staff-reset-title">
    <div className="record-modal-head"><div><h2 id="staff-reset-title"><KeyRound size={19}/> স্টাফের PIN রিসেট</h2><p className="muted text-xs">{modal.user.name} · {toAsciiDigits(modal.user.phone||"")}</p></div><button className="btn sm" type="button" onClick={close} disabled={resetBusy}><X size={17}/></button></div>
    <form onSubmit={resetStaffPin}><div className="record-modal-body"><p>এই স্টাফের জন্য নতুন ৫ সংখ্যার PIN দিন। প্রথমবার PIN তৈরি করতেও এটি ব্যবহার করা যাবে।</p>
     <PinInput label="নতুন ৫ সংখ্যার PIN" value={resetPin} onChange={setResetPin} disabled={resetBusy}/>
     {(localError||error)&&<p role="alert" className="alert error">{localError||error}</p>}
    </div><div className="record-modal-actions"><button className="btn" type="button" disabled={resetBusy} onClick={close}>বাতিল</button>
     <button className="btn primary" type="submit" disabled={resetBusy||resetPin.length!==5}>{resetBusy?"রিসেট হচ্ছে…":"PIN রিসেট করুন"}</button></div></form>
   </section>:modal.kind==="delete"?<section className="record-modal record-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="teacher-delete-title">
    <div className="record-modal-head"><h2 id="teacher-delete-title"><AlertTriangle size={19}/> Delete Teacher?</h2><button className="btn sm" type="button" onClick={close} disabled={working}><X size={17}/></button></div>
    <div className="record-modal-body"><p><b>{modal.user.name}</b>'s teacher account will be permanently deleted.</p>{(localError||error)&&<p className="alert error">{localError||error}</p>}</div>
    <div className="record-modal-actions"><button className="btn" type="button" disabled={working} onClick={close}>Cancel</button>
     <button className="btn danger" type="button" disabled={working} onClick={remove}>{working?"Deleting…":"Yes, Delete"}</button></div>
   </section>:<section className="record-modal hmrs-teacher-modal" role="dialog" aria-modal="true" aria-labelledby="teacher-modal-title">
    <div className="record-modal-head"><div><h2 id="teacher-modal-title">{modal.kind==="create"?"Add Teacher":"Edit Teacher"}</h2><p className="muted text-xs">Choose roles, assigned classes and teaching subjects.</p></div>
     <button type="button" className="btn sm" onClick={close} disabled={working} aria-label="Close"><X size={18}/></button></div>
    <form onSubmit={submit}><div className="record-modal-body">
     {(localError||error)&&<p role="alert" className="alert error">{localError||error}</p>}
     <div className="form-grid">
      <label className="field">Teacher Name<input value={values.name} onChange={e=>changed("name",e.target.value)} required maxLength={120}/></label>
      <label className="field">Login Phone<input type="tel" value={values.phone} onChange={e=>changed("phone",e.target.value)} required/></label>
       <div className="field record-wide hmrs-photo-field"><span>Teacher Photo (shown on the home page)</span>
        <div className="hmrs-photo-field-row">
         {values.photoUrl?<img className="hmrs-photo-preview" src={values.photoUrl} alt="Teacher photo preview" onError={e=>{e.currentTarget.style.visibility="hidden"}}/>:<span className="hmrs-photo-preview is-empty"><UserRound size={30}/></span>}
         <div className="hmrs-photo-field-actions">
          <label className={"btn sm hmrs-photo-upload"+(photoBusy?" is-busy":"")}><Upload size={14}/> {photoBusy?"Uploading…":values.photoUrl?"Replace photo":"Upload photo"}
           <input type="file" accept="image/jpeg,image/png,image/webp" disabled={photoBusy||working} onChange={e=>{uploadPhoto(e.target.files?.[0]);e.target.value=""}}/></label>
          {values.photoUrl&&<button type="button" className="btn sm danger" disabled={photoBusy||working} onClick={()=>changed("photoUrl","")}>Remove</button>}
         </div>
        </div>
        <small className="muted">JPG, PNG or WebP, up to 3 MB. Click Save to publish it on the home page.</small>
       </div>
       <label className="field record-wide">Or photo HTTPS link<input type="url" value={values.photoUrl} onChange={e=>changed("photoUrl",e.target.value)} placeholder="https://..."/></label>
     </div>
     <Choices label="কর্মীর ভূমিকা" kind="roles" description="প্রশাসনিক ভূমিকা আলাদা অ্যাকাউন্ট হিসেবে তৈরি করুন।"
      options={[{value:"teacher",label:"বিষয় শিক্ষক",description:"নির্ধারিত বিষয় পড়াবেন"},
       {value:"class_teacher",label:"শ্রেণি শিক্ষক",description:"নিজ শ্রেণির কাজ"},
       ...(modal.kind==="create"?[{value:"assistant_principal",label:"সহকারী প্রধান শিক্ষক",description:"প্রশাসনিক দায়িত্ব"},{value:"staff_manager",label:"স্টাফ ম্যানেজার",description:"সবার PIN রিসেট"}]:[])]}
      values={values.roles} onChange={v=>changed("roles",v)}/>
     <div className="form-grid hmrs-teacher-pin-row">
      <div className="field"><PinInput label={modal.kind==="create"?"5-digit PIN":"New PIN (leave blank to keep current)"} value={values.pin} onChange={v=>changed("pin",v)}/></div>
     </div>
     <div className="hmrs-teacher-grade-pickers">
       {!values.roles.some(r=>["assistant_principal","staff_manager"].includes(r))&&values.roles.includes("teacher")&&<Choices kind="classes" label="Teaching Classes"
        description="Select multiple classes" options={EN_CLASSES}
        values={values.teachingClasses} onChange={v=>changed("teachingClasses",v)}/>}
       {!values.roles.some(r=>["assistant_principal","staff_manager"].includes(r))&&values.roles.includes("class_teacher")&&<Choices kind="classes" label="Homeroom Classes"
        description="Choose responsible classes" options={EN_CLASSES}
        values={values.classTeacherClasses} onChange={v=>changed("classTeacherClasses",v)}/>}
     </div>
     {!values.roles.some(r=>["assistant_principal","staff_manager"].includes(r))&&<Choices kind="subjects" label="Teaching Subjects" description="Only selected subjects appear for marks entry"
      searchable options={EN_SUBJECTS} values={values.teachingSubjects}
      onChange={v=>changed("teachingSubjects",v)}/>}
     {modal.kind==="edit"&&<button type="button" role="switch" aria-checked={values.active}
      className={"hmrs-teacher-account-switch "+(values.active?"is-on":"")} onClick={()=>changed("active",!values.active)}>
      <span className="hmrs-teacher-switch-knob"/><span>Account {values.active?"Active":"Inactive"}</span>
     </button>}
    </div><div className="record-modal-actions"><button type="button" className="btn" disabled={working} onClick={close}>Cancel</button>
     <button className="btn primary" disabled={working||photoBusy} type="submit">{working?"Saving…":photoBusy?"Uploading photo…":modal.kind==="create"?"Add Teacher":"Save Changes"}</button></div></form>
   </section>}
  </div>}
 </section>;
}
