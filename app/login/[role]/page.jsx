"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { ArrowLeft, ArrowRight, GraduationCap, School, ShieldCheck, UserRound, UsersRound, UserCog, Smartphone } from "lucide-react";
import SiteHeader from "../../../components/SiteHeader";
import { firebaseAuth } from "../../../lib/firebase-client";
import PinInput from "../../../components/PinInput";

const roles=[
 {key:"student",title:"শিক্ষার্থী",icon:GraduationCap},
 {key:"teacher",title:"শিক্ষক",icon:UserRound},
 {key:"class_teacher",title:"শ্রেণি শিক্ষক",icon:UsersRound},
 {key:"principal",title:"প্রধান শিক্ষক",icon:UserCog}
];
export default function Login(){
 const {role}=useParams(), router=useRouter();
 const active=roles.find(v=>v.key===role);
 const [phone,setPhone]=useState(""),[pin,setPin]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 if(!active)return <main className="container py-16">পোর্টাল পাওয়া যায়নি। <Link href="/">হোম</Link></main>;
 async function submit(e){
  e.preventDefault();setBusy(true);setError("");
  try{
   const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone,pin,role}),cache:"no-store"});
   const body=await response.json();
   if(!response.ok)throw Error(body.error||"লগইন করা যায়নি");
   const credential=await signInWithCustomToken(firebaseAuth(),body.customToken);
   const token=await credential.user.getIdToken();
   const profile=await fetch("/api/portal?resource=profile",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
   if(!profile.ok)throw Error("অ্যাকাউন্টে প্রবেশাধিকার পাওয়া যায়নি");
   router.replace("/dashboard");
  }catch(err){setError(err.message?.includes("auth/")?"সাইন-ইন সম্পন্ন হয়নি। আবার চেষ্টা করুন।":err.message);setPin("");}finally{setBusy(false)}
 }
 return <><SiteHeader/><main className="login-stage">
   <div className="login-shell">
     <div className="flex justify-between items-center mb-5">
       <Link href="/" className="inline-flex gap-2 items-center text-xs muted"><ArrowLeft size={15}/> হোমে ফিরুন</Link>
       <span className="inline-flex gap-1 items-center text-xs font-bold" style={{color:"#176b61"}}><ShieldCheck size={15}/> HMRS Secure</span>
     </div>
     <div className="login-surface">
       <div className="login-symbol"><School size={25}/></div>
       <p className="kicker text-center mb-2 mt-4">SCHOOL PORTAL</p>
       <h1 className="login-heading">আপনার পোর্টালে স্বাগতম</h1>
       <p className="text-center muted text-sm mb-6">মোবাইল নম্বর এবং ৫ সংখ্যার PIN দিয়ে প্রবেশ করুন।</p>
       <div className="portal-switch" aria-label="পোর্টাল নির্বাচন">
         {roles.map(v=><Link key={v.key} href={"/login/"+v.key} aria-current={role===v.key?"page":undefined}
            className={"portal-option "+(role===v.key?"selected":"")} onClick={()=>{setError("");setPin("");}}>
           <v.icon size={18}/><span>{v.title}</span>
         </Link>)}
       </div>
       <form onSubmit={submit} className="grid gap-5 mt-6">
         <label className="field">মোবাইল নম্বর
           <div className="phone-input-wrap"><Smartphone size={19} color="#71869a"/>
             <input required type="tel" inputMode="tel" autoComplete="tel-national"
               name="phone" value={phone} onChange={e=>setPhone(e.target.value)}
               placeholder="01712345678 অথবা +8801712345678" maxLength={20}/></div>
         </label>
         <PinInput value={pin} onChange={setPin} disabled={busy}/>
         {error&&<div className="alert error" role="alert">{error}</div>}
         <button type="submit" className="btn primary login-submit" disabled={busy||pin.length!==5}>
           {busy?"প্রবেশ করা হচ্ছে...":"পোর্টালে প্রবেশ করুন"} <ArrowRight size={19}/>
         </button>
       </form>
       <p className="text-center muted text-xs mt-6 mb-0">PIN কাউকে জানাবেন না। বারবার ভুল PIN দিলে কিছু সময় লগইন বন্ধ থাকবে।</p>
     </div>
     <p className="muted text-xs text-center mt-5">
       পুরোনো ইমেইল/পাসওয়ার্ড অ্যাকাউন্ট আছে? <Link className="font-bold" href="/migrate" style={{color:"#176b61"}}>একবার ফোন + PIN সেট করুন</Link>
     </p>
   </div>
 </main></>;
}
