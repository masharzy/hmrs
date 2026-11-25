"use client";
import {useEffect,useMemo,useState} from "react";
import {RefreshCw,ShieldCheck,KeyRound} from "lucide-react";
import {firebaseAuth} from "../lib/firebase-client";
import PinInput from "./PinInput";
const labels={principal:"প্রধান শিক্ষক",assistant_principal:"সহকারী প্রধান শিক্ষক",staff_manager:"স্টাফ ম্যানেজার",teacher:"বিষয় শিক্ষক",class_teacher:"শ্রেণি শিক্ষক",student:"শিক্ষার্থী",guardian:"অভিভাবক"};
export default function AccountPinReset(){
 const [items,setItems]=useState([]),[uid,setUid]=useState(""),[pin,setPin]=useState(""),[query,setQuery]=useState("");
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[success,setSuccess]=useState("");
 async function token(){const user=firebaseAuth().currentUser;if(!user)throw Error("আবার লগইন করুন");return user.getIdToken()}
 async function load(){setLoading(true);setError("");try{const t=await token(),r=await fetch("/api/account-reset",{headers:{Authorization:"Bearer "+t},cache:"no-store"}),d=await r.json();if(!r.ok)throw Error(d.error||"তালিকা আনা যায়নি");setItems(d.items||[])}catch(e){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 const filtered=useMemo(()=>items.filter(x=>(x.name+" "+x.phone+" "+(labels[x.role]||x.role)).toLowerCase().includes(query.trim().toLowerCase())),[items,query]);
 async function submit(e){e.preventDefault();if(!uid||pin.length!==5)return;setBusy(true);setError("");setSuccess("");
  try{const t=await token(),r=await fetch("/api/account-reset",{method:"POST",headers:{Authorization:"Bearer "+t,"Content-Type":"application/json"},body:JSON.stringify({uid,pin})}),d=await r.json();if(!r.ok)throw Error(d.error||"PIN রিসেট হয়নি");setSuccess("নতুন PIN সেট হয়েছে। পুরোনো সেশন বাতিল করা হয়েছে।");setPin("");}
  catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <section className="panel p-5 mt-5"><div className="flex items-center gap-3 mb-2"><span className="rounded-xl bg-slate-100 p-3"><ShieldCheck size={21}/></span><div><h2 className="font-bold text-lg">সবার PIN রিসেট</h2><p className="muted text-xs mb-0">শুধু প্রধান শিক্ষক, সহকারী প্রধান শিক্ষক ও স্টাফ ম্যানেজার ব্যবহার করতে পারবেন।</p></div>
 <button type="button" className="btn sm ml-auto" onClick={load} disabled={loading}><RefreshCw size={14}/> রিফ্রেশ</button></div>
 <form onSubmit={submit} className="grid gap-3 mt-4">
  <label className="field">নাম / মোবাইল দিয়ে খুঁজুন<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="নাম বা মোবাইল নম্বর"/></label>
  <label className="field">অ্যাকাউন্ট নির্বাচন<select value={uid} onChange={e=>setUid(e.target.value)} required><option value="">ব্যবহারকারী নির্বাচন করুন</option>{filtered.map(x=><option key={x.id} value={x.id}>{x.name} · {labels[x.role]||x.role} · {x.phone}</option>)}</select></label>
  <label className="field">নতুন ৫ সংখ্যার PIN</label><PinInput value={pin} onChange={setPin} disabled={busy}/>
  {error&&<p className="alert error" role="alert">{error}</p>}{success&&<p className="alert" role="status">{success}</p>}
  <button className="btn primary" disabled={busy||loading||!uid||pin.length!==5}><KeyRound size={16}/>{busy?"রিসেট হচ্ছে...":"PIN রিসেট করুন"}</button>
  <p className="muted text-xs mb-0">{loading?"অ্যাকাউন্ট তালিকা আনা হচ্ছে...":filtered.length+"টি সক্রিয় অ্যাকাউন্ট"} · রিসেট করলে সংশ্লিষ্ট ব্যবহারকারীর পুরোনো লগইন সেশন বাতিল হবে।</p>
 </form></section>
}
