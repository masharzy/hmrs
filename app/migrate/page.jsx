"use client";
import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {signInWithEmailAndPassword,signInWithCustomToken} from "firebase/auth";
import {ArrowLeft,ArrowRight,ShieldCheck,Smartphone} from "lucide-react";
import {firebaseAuth} from "../../lib/firebase-client";
import PinInput from "../../components/PinInput";
import SiteHeader from "../../components/SiteHeader";
export default function Migrate(){
 const router=useRouter(),[phase,setPhase]=useState("verify");
 const [form,setForm]=useState({email:"",password:"",phone:"",pin:""});
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const change=e=>setForm(f=>({...f,[e.target.name]:e.target.value}));
 async function verify(e){
  e.preventDefault();setBusy(true);setError("");
  try{
    const c=await signInWithEmailAndPassword(firebaseAuth(),form.email,form.password);
    const token=await c.user.getIdToken();
    const result=await fetch("/api/portal?resource=profile",{headers:{Authorization:"Bearer "+token}});
    if(!result.ok)throw Error("পুরোনো অ্যাকাউন্ট পাওয়া যায়নি");
    const profile=await result.json();
    if(profile.actor.pinEnabled)throw Error("এই অ্যাকাউন্টে ইতিমধ্যেই PIN রয়েছে। স্বাভাবিক লগইন ব্যবহার করুন।");
    setPhase("enroll");setForm(f=>({...f,password:""}));
  }catch(e){setError(e.message?.includes("auth/")?"পুরোনো ইমেইল অথবা পাসওয়ার্ড সঠিক নয়":e.message)}
  finally{setBusy(false)}
 }
 async function enroll(e){
  e.preventDefault();setBusy(true);setError("");
  try{
    const token=await firebaseAuth().currentUser.getIdToken();
    const res=await fetch("/api/auth/enroll",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({phone:form.phone,pin:form.pin})});
    const result=await res.json();if(!res.ok)throw Error(result.error||"আপগ্রেড করা যায়নি");
    await signInWithCustomToken(firebaseAuth(),result.customToken);
    router.replace("/dashboard");
  }catch(e){setError(e.message);setForm(f=>({...f,pin:""}));}
  finally{setBusy(false)}
 }
 return <><SiteHeader/><main className="login-stage"><div className="login-shell">
  <Link href="/login/principal" className="text-xs muted inline-flex items-center gap-2 mb-5"><ArrowLeft size={15}/> লগইন পোর্টাল</Link>
  <div className="login-surface">
   <div className="login-symbol"><ShieldCheck size={25}/></div>
   <h1 className="login-heading mt-4">পুরোনো অ্যাকাউন্ট আপগ্রেড</h1>
   <p className="text-center muted text-sm mb-6">{phase==="verify"?"শুধু একবার পুরোনো অ্যাকাউন্ট যাচাই করতে হবে।":"এখন থেকে শুধু ফোন নম্বর ও PIN দিয়ে লগইন করবেন।"}</p>
   {phase==="verify"?<form className="grid gap-4" onSubmit={verify}>
    <label className="field">পুরোনো ইমেইল<input type="email" required value={form.email} name="email" onChange={change} autoComplete="email"/></label>
    <label className="field">পুরোনো পাসওয়ার্ড<input type="password" required value={form.password} name="password" onChange={change} autoComplete="current-password"/></label>
    {error&&<div className="alert error">{error}</div>}
    <button className="btn primary login-submit" disabled={busy}>{busy?"যাচাই হচ্ছে...":"পরবর্তী ধাপ"} <ArrowRight size={17}/></button>
   </form>:<form className="grid gap-5" onSubmit={enroll}>
    <label className="field">মোবাইল নম্বর<div className="phone-input-wrap"><Smartphone size={18}/><input type="tel" inputMode="tel" name="phone" required value={form.phone} onChange={change} placeholder="01712345678 অথবা +8801712345678"/></div></label>
    <PinInput value={form.pin} onChange={pin=>setForm(f=>({...f,pin}))} label="নতুন ৫ সংখ্যার PIN"/>
    {error&&<div className="alert error">{error}</div>}
    <button className="btn primary login-submit" disabled={busy||form.pin.length!==5}>PIN সেট করুন <ArrowRight size={17}/></button>
   </form>}
  </div>
  <p className="muted text-xs text-center mt-5">পুরোনো অ্যাকাউন্টটি অক্ষত থাকবে; নতুন লগইন হবে PIN দিয়ে।</p>
 </div></main></>;
}
