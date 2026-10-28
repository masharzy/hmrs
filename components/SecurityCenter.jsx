"use client";
import { useEffect, useState } from "react";
import { LockKeyhole, ShieldCheck, Smartphone, Clock3, UnlockKeyhole, RefreshCw, AlertTriangle } from "lucide-react";
import { firebaseAuth } from "../lib/firebase-client";
import { toBanglaDigits } from "../lib/bangla-numbers";

export default function SecurityCenter(){
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[working,setWorking]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[notes,setNotes]=useState({});
 async function api(method="GET",body){
  const user=firebaseAuth().currentUser;
  if(!user)throw Error("লগইন প্রয়োজন");
  const token=await user.getIdToken();
  const res=await fetch("/api/security",{
    method,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
    body:body?JSON.stringify(body):undefined,cache:"no-store"
  });
  const data=await res.json();
  if(!res.ok)throw Error(data.error||"অনুরোধ ব্যর্থ হয়েছে");
  return data;
 }
 async function load(){
  setLoading(true);setError("");
  try{const v=await api();setItems(v.items||[])}
  catch(e){setError(e.message)}finally{setLoading(false)}
 }
 useEffect(()=>{load()},[]);
 async function unlock(uid){
  setWorking(true);setError("");setNotice("");
  try{
    const note=notes[uid]||"";
    if(note.trim().length<5)throw Error("আনলক করার কারণ অন্তত ৫ অক্ষরে লিখুন।");
    await api("POST",{uid,note});
    setNotice("অ্যাকাউন্ট আনলক করা হয়েছে এবং audit log-এ কারণ সংরক্ষিত হয়েছে।");
    await load();
  }catch(e){setError(e.message)}finally{setWorking(false)}
 }
 return <div className="security-center">
   <div className="security-intro panel">
    <div className="security-intro-symbol"><ShieldCheck size={27}/></div>
    <div><h2>Account Security Center</h2><p>২০টি ধারাবাহিক ভুল PIN-এর কারণে লক হওয়া অ্যাকাউন্ট পর্যালোচনা ও আনলক করুন।</p></div>
    <button className="btn sm" onClick={load} disabled={loading||working}><RefreshCw size={16}/> রিফ্রেশ</button>
   </div>
   <div className="security-summary">
    <div className="panel security-summary-card"><LockKeyhole size={23}/><strong>{toBanglaDigits(items.length)}</strong><small>লক অ্যাকাউন্ট</small></div>
    <div className="panel security-summary-card"><Smartphone size={23}/><strong>৫</strong><small>ভুল PIN → ১২ ঘণ্টা ডিভাইস লক</small></div>
    <div className="panel security-summary-card"><ShieldCheck size={23}/><strong>২০</strong><small>ভুল PIN → Principal Unlock</small></div>
   </div>
   {error&&<div className="alert error" role="alert">{error}</div>}
   {notice&&<div className="alert" role="status">{notice}</div>}
   {loading?<div className="panel empty">নিরাপত্তার তথ্য যাচাই হচ্ছে...</div>:
   !items.length?<div className="panel security-clear"><ShieldCheck size={38}/><h3>কোনো অ্যাকাউন্ট লক নেই</h3><p>এ মুহূর্তে ২০টি ভুল PIN-এর কারণে লক হওয়া কোনো অ্যাকাউন্ট নেই।</p></div>:
   <div className="grid gap-5">{items.map(item=><section className="panel security-account" key={item.uid}>
    <div className="security-account-head">
     <div><span className="chip red"><LockKeyhole size={13}/> লগইন বন্ধ</span><h3>{item.name}</h3>
      <div className="muted text-sm">{item.phone} · {item.role} · {toBanglaDigits(item.failures)}টি ভুল চেষ্টা</div></div>
     <div className="text-xs muted"><Clock3 size={14} className="inline"/> {item.lockedAt?new Date(item.lockedAt).toLocaleString("bn-BD"):"—"}</div>
    </div>
    <div className="security-reason"><AlertTriangle size={18}/><div><b>কেন লক হয়েছে</b><p>{item.reason}</p></div></div>
    <h4 className="font-bold mb-3">সাম্প্রতিক ভুল প্রচেষ্টার ইতিহাস</h4>
    <div className="security-attempts">{(item.history||[]).map((attempt,i)=><div key={i} className="security-attempt">
       <Smartphone size={18}/><div><b>{attempt.deviceLabel||"অজানা ডিভাইস"}</b>
        <p>ডিভাইস #{attempt.deviceId} · IP {attempt.ip||"—"} · {attempt.reason}</p></div>
       <small>{attempt.at?new Date(attempt.at).toLocaleString("bn-BD"):"—"}</small>
     </div>)}</div>
    <div className="security-unlock">
     <label className="field">আনলক করার কারণ লিখুন
       <input type="text" maxLength={200} value={notes[item.uid]||""}
        placeholder="যাচাই করে অ্যাকাউন্ট পুনরায় চালু করা হচ্ছে..." onChange={e=>setNotes(n=>({...n,[item.uid]:e.target.value}))}/>
     </label>
     <button className="btn primary" onClick={()=>unlock(item.uid)}
       disabled={working||(notes[item.uid]||"").trim().length<5}><UnlockKeyhole size={17}/> আনলক করুন</button>
    </div>
   </section>)}</div>}
   <p className="text-xs muted mt-5">ডিভাইস শনাক্তকরণ ব্রাউজারে রাখা নিরাপদ cookie-এর মাধ্যমে হয়। Cookie মুছে ফেললে একই শারীরিক ফোনকে নতুন ডিভাইস হিসেবে দেখা যেতে পারে; এটি অব্যর্থ hardware পরিচয় নয়।</p>
 </div>;
}
