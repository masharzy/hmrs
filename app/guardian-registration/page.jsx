"use client";
import {useState} from "react";
import Link from "next/link";
import {ArrowLeft,ShieldCheck} from "lucide-react";
import SiteHeader from "../../components/SiteHeader";
import PinInput from "../../components/PinInput";
export default function GuardianRegistration(){
 const [form,setForm]=useState({guardianName:"",relation:"father",phone:"",grade:"",group:"",roll:"",birthRegistration:""});
 const [pin,setPin]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const change=(key,value)=>setForm(old=>({...old,[key]:value}));
 async function submit(e){e.preventDefault();setBusy(true);setError("");setSuccess("");
  try{const response=await fetch("/api/guardian-requests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,pin}),cache:"no-store"});
   const body=await response.json();if(!response.ok)throw Error(body.error||"আবেদন জমা দেওয়া যায়নি");setSuccess(body.message||"আবেদন জমা হয়েছে।");
  }catch(err){setError(err.message)}finally{setBusy(false)}
 }
 return <><SiteHeader/><main className="container py-10"><section className="panel mx-auto max-w-2xl p-6 sm:p-8">
  <Link href="/login/guardian" className="inline-flex items-center gap-2 text-sm muted"><ArrowLeft size={15}/> অভিভাবক লগইন</Link>
  <div className="text-center my-6"><span className="inline-flex rounded-full bg-slate-100 p-3"><ShieldCheck size={28}/></span>
   <h1 className="section-title mt-3">অভিভাবক আইডির আবেদন</h1><p className="muted text-sm">শিক্ষার্থীর জন্মনিবন্ধন ও বিদ্যালয়ে সংরক্ষিত অভিভাবকের মোবাইল নম্বর দিয়ে পরিচয় যাচাই হবে।</p></div>
  {success?<div className="alert" role="status">{success}<p className="mt-3 mb-0"><Link className="font-bold underline" href="/login/guardian">অভিভাবক লগইনে যান</Link></p></div>:
  <form onSubmit={submit} className="grid gap-4">
   <div className="form-grid">
    <label className="field">অভিভাবকের নাম<input required maxLength={100} value={form.guardianName} onChange={e=>change("guardianName",e.target.value)}/></label>
    <label className="field">শিক্ষার্থীর সঙ্গে সম্পর্ক<select value={form.relation} onChange={e=>change("relation",e.target.value)}><option value="father">পিতা</option><option value="mother">মাতা</option><option value="guardian">আইনগত অভিভাবক</option></select></label>
    <label className="field">অভিভাবকের মোবাইল নম্বর<input required type="tel" inputMode="tel" value={form.phone} onChange={e=>change("phone",e.target.value)} placeholder="01XXXXXXXXX"/></label>
    <label className="field">শ্রেণি<select required value={form.grade} onChange={e=>{change("grade",e.target.value);change("group","")}}><option value="">শ্রেণি নির্বাচন</option>{[6,7,8,9,10].map(n=><option key={n} value={n}>{n}ম</option>)}</select></label>
    {Number(form.grade)>=9&&<label className="field">বিভাগ<select required value={form.group} onChange={e=>change("group",e.target.value)}><option value="">বিভাগ নির্বাচন</option><option value="science">বিজ্ঞান</option><option value="business">ব্যবসায় শিক্ষা</option><option value="humanities">মানবিক</option></select></label>}
    <label className="field">শিক্ষার্থীর রোল<input required inputMode="numeric" maxLength={4} value={form.roll} onChange={e=>change("roll",e.target.value)}/></label>
    <label className="field form-grid-full">শিক্ষার্থীর জন্মনিবন্ধন নম্বর<input required inputMode="numeric" maxLength={17} value={form.birthRegistration} onChange={e=>change("birthRegistration",e.target.value)}/></label>
   </div>
   <label className="field">নতুন ৫ সংখ্যার PIN</label><PinInput value={pin} onChange={setPin} disabled={busy}/>
   {error&&<p className="alert error" role="alert">{error}</p>}
   <button className="btn primary w-full" disabled={busy||pin.length!==5}>{busy?"আবেদন জমা হচ্ছে...":"যাচাইয়ের জন্য আবেদন জমা দিন"}</button>
   <p className="muted text-xs mb-0">আবেদন জমা দিলেই অ্যাকাউন্ট চালু হবে না। প্রধান শিক্ষক বা সহকারী প্রধান শিক্ষক পরিচয় যাচাই করে অনুমোদন দিলে অ্যাকাউন্ট সক্রিয় হবে।</p>
  </form>}
 </section></main></>}
