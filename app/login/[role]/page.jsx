"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ArrowLeft, LockKeyhole, School, LogIn } from "lucide-react";
import { firebaseAuth, staffEmail, studentEmail } from "../../../lib/firebase-client";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
const roles={student:"শিক্ষার্থী",teacher:"শিক্ষক",class_teacher:"শ্রেণি শিক্ষক",principal:"প্রতিষ্ঠান প্রধান"};
export default function Login(){
 const {role}=useParams(),router=useRouter(),[form,setForm]=useState({grade:"6",section:"a",roll:"",username:"",password:""}),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const change=e=>setForm(o=>({...o,[e.target.name]:e.target.value}));
 async function submit(e){
  e.preventDefault();setBusy(true);setError("");
  try {
   const email=role==="student"?studentEmail(form.grade,form.section,form.roll):role==="principal"?form.username.includes("@")?form.username:staffEmail(form.username):staffEmail(form.username);
   const auth=firebaseAuth();const credential=await signInWithEmailAndPassword(auth,email,form.password);
   const token=await credential.user.getIdToken();
   const response=await fetch("/api/portal?resource=profile",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
   const result=await response.json();if(!response.ok)throw Error(result.error||"প্রবেশাধিকার নেই");
   if(result.actor.role!==role)throw Error("এই অ্যাকাউন্টের জন্য অন্য লগইন পোর্টাল নির্বাচন করুন");
   router.replace("/dashboard");
  } catch(e){setError(e.message?.includes("auth/")?"ইউজার আইডি বা পাসওয়ার্ড সঠিক নয়":e.message)}finally{setBusy(false)}
 }
 if(!roles[role])return <div className="container py-16">লগইন পোর্টাল পাওয়া যায়নি। <Link href="/">হোম</Link></div>;
 return <><SiteHeader/><main className="container" style={{maxWidth:470,paddingTop:58,paddingBottom:65}}>
 <Link href="/" className="muted flex items-center gap-2 text-xs mb-6"><ArrowLeft size={15}/> হোম পেজে ফিরুন</Link>
 <div className="panel p-8 sm:p-10">
  <div className="flex items-center justify-center mb-5" style={{height:56,width:56,borderRadius:10,background:"#e9f4ef",marginInline:"auto"}}><LockKeyhole color="#176b61" size={25}/></div>
  <div className="text-center mb-8"><span className="kicker">SECURE PORTAL</span><h1 className="section-title mt-2 mb-2">{roles[role]} লগইন</h1><p className="muted text-sm">আপনার অ্যাকাউন্টের তথ্য দিয়ে প্রবেশ করুন</p></div>
  <form onSubmit={submit} className="grid gap-4">
   {role==="student"?<><div className="form-grid">
    <label className="field">শ্রেণি <select name="grade" value={form.grade} onChange={change}>{[6,7,8,9,10].map(g=><option value={g} key={g}>{g}ম শ্রেণি</option>)}</select></label>
    <label className="field">শাখা <select name="section" value={form.section} onChange={change}><option value="a">ক / A</option><option value="b">খ / B</option><option value="c">গ / C</option></select></label>
   </div><label className="field">রোল নম্বর <input required name="roll" inputMode="numeric" placeholder="যেমন: ১২" value={form.roll} onChange={change}/></label></>:
   <label className="field">ইউজার আইডি {role==="principal"&&"(অথবা ইমেইল)"}<input required name="username" placeholder="আপনার ইউজার আইডি" value={form.username} onChange={change}/></label>}
   <label className="field">পাসওয়ার্ড <input required minLength={8} name="password" type="password" autoComplete="current-password" value={form.password} onChange={change}/></label>
   {error&&<div role="alert" className="alert error">{error}</div>}
   <button disabled={busy} type="submit" className="btn primary w-full mt-2">{busy?"যাচাই হচ্ছে...":"লগইন করুন"} <LogIn size={17}/></button>
  </form>
 </div>{role==="principal"&&<p className="text-center text-xs mt-5"><Link href="/install" className="text-primary font-bold hover:underline">প্রথমবার বিদ্যালয় সেটআপ করুন</Link></p>}<p className="text-center muted text-xs mt-5"><School size={14} className="inline mr-1"/> লগইন তথ্য বিদ্যালয় কর্তৃপক্ষ থেকে সংগ্রহ করুন।</p>
 </main><SiteFooter/></>;
}