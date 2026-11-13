"use client";
import { useMemo, useState } from "react";
import { Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import { toBanglaDigits, toAsciiDigits } from "../lib/bangla-numbers";
import PinInput from "./PinInput";

const roles={principal:"প্রধান শিক্ষক",teacher:"শিক্ষক",class_teacher:"শ্রেণি শিক্ষক",student:"শিক্ষার্থী"};
const display=u=>roles[u.role]||u.role;
const classList=v=>(v||[]).map(x=>String(x).split("-")[0]).join(", ");
export default function AccountManager({users=[],actor,mutate,working,error}){
 const [search,setSearch]=useState(""),[page,setPage]=useState(1),[editing,setEditing]=useState(null),[deleting,setDeleting]=useState(null);
 const [values,setValues]=useState({}),[localError,setLocalError]=useState("");
 const filtered=useMemo(()=>{
  const q=toAsciiDigits(search).trim().toLowerCase();
  return [...users].filter(u=>(u.name+" "+u.phone+" "+display(u)).toLowerCase().includes(q)).sort((a,b)=>String(a.name).localeCompare(String(b.name),"bn"));
 },[users,search]);
 const size=20,maxPage=Math.max(1,Math.ceil(filtered.length/size));
 const current=Math.min(page,maxPage);
 const visible=filtered.slice((current-1)*size,current*size);
 function openEdit(user){
  setEditing(user);setDeleting(null);setLocalError("");
  setValues({name:user.name||"",phone:user.phone||"",role:user.role,assignedClasses:classList(user.assignedClasses),pin:"",active:user.active!==false});
 }
 function close(){if(working)return;setEditing(null);setDeleting(null);setLocalError("")}
 async function save(e){
  e.preventDefault();
  if(!editing||working)return;
  setLocalError("");
  if(values.pin&& !/^\d{5}$/.test(toAsciiDigits(values.pin))){setLocalError("PIN অবশ্যই পাঁচ সংখ্যার হতে হবে");return}
  if(editing.id===actor.uid&&(values.role!=="principal"||!values.active)){setLocalError("নিজের প্রধান শিক্ষক অধিকার বা অ্যাকাউন্ট নিষ্ক্রিয় করা যাবে না");return}
  const r=await mutate("account.update",{uid:editing.id,values:{...values,assignedClasses:values.assignedClasses.split(",").map(s=>s.trim())}});
  if(r)setEditing(null);
 }
 async function remove(){
  if(!deleting||working)return;
  setLocalError("");
  const r=await mutate("account.delete",{uid:deleting.id,confirmed:true});
  if(r)setDeleting(null);
 }
 return <section className="hmrs-accounts">
  <div className="hmrs-accounts-toolbar"><div><h2 className="section-title">সব ব্যবহারকারী</h2><p className="muted text-xs">শিক্ষার্থীসহ সব অ্যাকাউন্টের তথ্য, ভূমিকা এবং PIN পরিবর্তন করা যাবে।</p></div>
   <label className="field">ব্যবহারকারী খুঁজুন<input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="নাম, মোবাইল বা ভূমিকা"/></label>
  </div>
  <div className="panel table-wrap"><table><thead><tr><th>ক্রমিক</th><th>নাম</th><th>মোবাইল</th><th>ভূমিকা</th><th>অবস্থা</th><th>ব্যবস্থা</th></tr></thead><tbody>
   {visible.map((user,i)=><tr key={user.id}><td>{toBanglaDigits((current-1)*size+i+1)}</td><td className="font-bold">{user.name}</td>
    <td>{toBanglaDigits(user.phone||"—")}</td><td>{display(user)}</td><td>{user.active===false?"নিষ্ক্রিয়":"সক্রিয়"}</td>
    <td><div className="inline-actions">
     <button className="btn sm" type="button" onClick={()=>openEdit(user)}><Pencil size={15}/> এডিট</button>
     <button className="btn sm danger" type="button" disabled={user.id===actor.uid} title={user.id===actor.uid?"নিজের অ্যাকাউন্ট মুছতে পারবেন না":undefined} onClick={()=>{setEditing(null);setLocalError("");setDeleting(user)}}><Trash2 size={15}/> ডিলিট</button>
    </div></td>
   </tr>)}
  </tbody></table>{!filtered.length&&<p className="empty">কোনো ব্যবহারকারী পাওয়া যায়নি।</p>}</div>
  {maxPage>1&&<div className="hmrs-sheet-bottom"><span>{toBanglaDigits(filtered.length)} জন · পৃষ্ঠা {toBanglaDigits(current)} / {toBanglaDigits(maxPage)}</span><div className="inline-actions">
   <button className="btn sm" type="button" disabled={current===1} onClick={()=>setPage(p=>p-1)}>আগের</button>
   <button className="btn sm" type="button" disabled={current===maxPage} onClick={()=>setPage(p=>p+1)}>পরের</button>
  </div></div>}
  {editing&&<div className="record-modal-backdrop"><section className="record-modal" role="dialog" aria-modal="true" aria-labelledby="hmrs-account-title">
    <div className="record-modal-head"><div><h2 id="hmrs-account-title"><Pencil size={18}/> অ্যাকাউন্ট এডিট</h2><p className="muted text-xs">{editing.name} · {display(editing)}</p></div>
     <button type="button" className="btn sm" disabled={working} onClick={close} aria-label="বন্ধ করুন"><X size={18}/></button></div>
    <form onSubmit={save}><div className="record-modal-body">
     {(localError||error)&&<p role="alert" className="alert error">{localError||error}</p>}
     <div className="form-grid">
      <label className="field">নাম<input value={values.name} required maxLength={120} onChange={e=>setValues(v=>({...v,name:e.target.value}))}/></label>
      <label className="field">লগইন মোবাইল<input type="tel" value={values.phone} placeholder="01XXXXXXXXX" onChange={e=>setValues(v=>({...v,phone:e.target.value}))}/></label>
      <label className="field">ভূমিকা<select value={values.role} disabled={editing.role==="student"||editing.id===actor.uid} onChange={e=>setValues(v=>({...v,role:e.target.value}))}>
       {(editing.role==="student"?["student"]:["teacher","class_teacher","principal"]).map(r=><option key={r} value={r}>{roles[r]}</option>)}
      </select></label>
      {values.role==="class_teacher"&&<label className="field">নির্ধারিত শ্রেণি (যেমন ৬,৭,৯)<input value={values.assignedClasses} onChange={e=>setValues(v=>({...v,assignedClasses:e.target.value}))}/></label>}
      <div className="field"><PinInput label="নতুন PIN (খালি রাখলে পুরোনোটিই থাকবে)" value={values.pin} onChange={pin=>setValues(v=>({...v,pin}))}/></div>
     </div>
     <label className="hmrs-account-active"><input type="checkbox" checked={!!values.active} disabled={editing.id===actor.uid} onChange={e=>setValues(v=>({...v,active:e.target.checked}))}/> অ্যাকাউন্ট সক্রিয় রাখুন</label>
     <p className="muted text-xs">PIN নিরাপদ hash হিসেবে সংরক্ষিত হবে; PIN পরিবর্তন হলে আগের সেশন বাতিল হবে। লগইন মোবাইল প্রতিটি অ্যাকাউন্টের জন্য আলাদা, তবে অভিভাবকের নম্বর একাধিক শিক্ষার্থীর রেকর্ডে থাকতে পারবে।</p>
    </div><div className="record-modal-actions"><button className="btn" type="button" disabled={working} onClick={close}>বাতিল</button><button className="btn primary" type="submit" disabled={working}>{working?"সংরক্ষণ হচ্ছে...":"সংরক্ষণ করুন"}</button></div></form>
   </section></div>}
  {deleting&&<div className="record-modal-backdrop"><section className="record-modal record-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="hmrs-account-delete" aria-describedby="hmrs-account-delete-description">
    <div className="record-modal-head"><h2 id="hmrs-account-delete"><AlertTriangle size={20}/> অ্যাকাউন্ট ডিলিট করবেন?</h2>
     <button className="btn sm" type="button" onClick={close} disabled={working} aria-label="বন্ধ করুন"><X size={18}/></button></div>
    <div className="record-modal-body"><p id="hmrs-account-delete-description"><b>{deleting.name}</b> ({display(deleting)})-এর অ্যাকাউন্ট স্থায়ীভাবে ডিলিট হবে।{deleting.role==="student"?" শিক্ষার্থীর হাজিরা, নম্বর এবং লগইন রেকর্ডও মুছে যাবে।":""} এই কাজ ফিরিয়ে আনা যাবে না।</p>
     {(localError||error)&&<p className="alert error" role="alert">{localError||error}</p>}</div>
    <div className="record-modal-actions"><button className="btn" type="button" onClick={close} disabled={working}>বাতিল</button><button className="btn danger" type="button" onClick={remove} disabled={working}><Trash2 size={15}/> {working?"ডিলিট হচ্ছে...":"নিশ্চিত, ডিলিট করুন"}</button></div>
   </section></div>}
 </section>;
}
