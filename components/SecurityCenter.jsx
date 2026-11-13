"use client";
import { useEffect, useState } from "react";
import { LockKeyhole, ShieldCheck, Smartphone, Clock3, UnlockKeyhole, RefreshCw, AlertTriangle } from "lucide-react";
import { firebaseAuth } from "../lib/firebase-client";
import { toAsciiDigits } from "../lib/bangla-numbers";

export default function SecurityCenter(){
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[working,setWorking]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[notes,setNotes]=useState({});
 async function api(method="GET",body){
  const user=firebaseAuth().currentUser;
  if(!user)throw Error("Sign in required");
  const token=await user.getIdToken();
  const res=await fetch("/api/security",{
    method,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
    body:body?JSON.stringify(body):undefined,cache:"no-store"
  });
  const data=await res.json();
  if(!res.ok)throw Error(data.error||"Request failed");
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
    if(note.trim().length<5)throw Error("Provide an unlock reason of at least 5 characters.");
    await api("POST",{uid,note});
    setNotice("Account unlocked. Reason recorded in the audit log.");
    await load();
  }catch(e){setError(e.message)}finally{setWorking(false)}
 }
 return <div className="security-center">
   <div className="security-intro panel">
    <div className="security-intro-symbol"><ShieldCheck size={27}/></div>
    <div><h2>Account Security Center</h2><p>Review accounts locked after 20 consecutive incorrect PIN attempts.</p></div>
    <button className="btn sm" onClick={load} disabled={loading||working}><RefreshCw size={16}/> Refresh</button>
   </div>
   <div className="security-summary">
    <div className="panel security-summary-card"><LockKeyhole size={23}/><strong>{toAsciiDigits(items.length)}</strong><small>Locked Accounts</small></div>
    <div className="panel security-summary-card"><Smartphone size={23}/><strong>5</strong><small>Wrong PINs → 12-hour device lock</small></div>
    <div className="panel security-summary-card"><ShieldCheck size={23}/><strong>20</strong><small>Wrong PINs → Head Teacher unlock</small></div>
   </div>
   {error&&<div className="alert error" role="alert">{error}</div>}
   {notice&&<div className="alert" role="status">{notice}</div>}
   {loading?<div className="panel empty">Loading security information…</div>:
   !items.length?<div className="panel security-clear"><ShieldCheck size={38}/><h3>No Locked Accounts</h3><p>No accounts are currently locked for repeated invalid PIN attempts.</p></div>:
   <div className="grid gap-5">{items.map(item=><section className="panel security-account" key={item.uid}>
    <div className="security-account-head">
     <div><span className="chip red"><LockKeyhole size={13}/> Login Locked</span><h3>{item.name}</h3>
      <div className="muted text-sm">{item.phone} · {item.role} · {toAsciiDigits(item.failures)} failed attempts</div></div>
     <div className="text-xs muted"><Clock3 size={14} className="inline"/> {item.lockedAt?new Date(item.lockedAt).toLocaleString("bn-BD"):"—"}</div>
    </div>
    <div className="security-reason"><AlertTriangle size={18}/><div><b>Reason for Lock</b><p>{item.reason}</p></div></div>
    <h4 className="font-bold mb-3">Recent Failed Login Attempts</h4>
    <div className="security-attempts">{(item.history||[]).map((attempt,i)=><div key={i} className="security-attempt">
       <Smartphone size={18}/><div><b>{attempt.deviceLabel||"Unknown Device"}</b>
        <p>Device #{attempt.deviceId} · IP {attempt.ip||"—"} · {attempt.reason}</p></div>
       <small>{attempt.at?new Date(attempt.at).toLocaleString("bn-BD"):"—"}</small>
     </div>)}</div>
    <div className="security-unlock">
     <label className="field">Reason for Unlock
       <input type="text" maxLength={200} value={notes[item.uid]||""}
        placeholder="Explain why this account should be unlocked…" onChange={e=>setNotes(n=>({...n,[item.uid]:e.target.value}))}/>
     </label>
     <button className="btn primary" onClick={()=>unlock(item.uid)}
       disabled={working||(notes[item.uid]||"").trim().length<5}><UnlockKeyhole size={17}/> Unlock Account</button>
    </div>
   </section>)}</div>}
   <p className="text-xs muted mt-5">Device recognition uses a secure browser cookie, not a permanent hardware identifier. Clearing cookies may register the same phone as a new device.</p>
 </div>;
}
