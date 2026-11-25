"use client";
import {useEffect,useState} from "react";
import {CheckCircle2,RefreshCw,XCircle,ShieldCheck} from "lucide-react";
import {toBanglaDigits} from "../lib/bangla-numbers";
const relations={father:"পিতা",mother:"মাতা",guardian:"আইনগত অভিভাবক"};
export default function GuardianRequestManager({request,mutate,working}){
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 async function load(){setLoading(true);setError("");try{const r=await request("guardian.requests");setItems(r.items||[])}catch(e){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 async function act(action,id){const ok=await mutate(action,{id});if(ok)await load()}
 return <section className="panel p-5 mb-5"><div className="flex items-center gap-3 mb-3"><ShieldCheck size={20}/><div className="flex-1"><h2 className="font-bold">অভিভাবক আইডি অনুমোদন</h2><p className="muted text-xs mb-0">শুধু প্রধান শিক্ষক ও সহকারী প্রধান শিক্ষক অনুমোদন দিতে পারবেন। মূল কাগজপত্র দেখে পরিচয় নিশ্চিত করুন।</p></div>
 <button className="btn sm" type="button" onClick={load} disabled={loading}><RefreshCw size={14}/> রিফ্রেশ</button></div>
 {error&&<p className="alert error">{error}</p>}
 {loading?<p className="empty">আবেদন লোড হচ্ছে...</p>:!items.length?<p className="empty">কোনো অপেক্ষমাণ আবেদন নেই।</p>:
 <div className="grid gap-3">{items.map(item=><article key={item.id} className="rounded-xl border p-4">
  <div className="flex flex-wrap justify-between gap-2"><div><b>{item.guardianName}</b><span className="muted text-sm"> · {relations[item.relation]||"অভিভাবক"}</span>
   <p className="text-sm mt-1 mb-0">{item.studentName} · শ্রেণি {toBanglaDigits(item.grade)}{item.group?" · "+({science:"বিজ্ঞান",business:"ব্যবসায় শিক্ষা",humanities:"মানবিক"}[item.group]||"")} · রোল {toBanglaDigits(item.roll)}</p>
   <small className="muted">মোবাইল: {toBanglaDigits(item.guardianPhoneMasked||"")}</small></div>
  <div className="flex items-center gap-2"><button className="btn sm primary" disabled={working} onClick={()=>act("guardian.approve",item.id)}><CheckCircle2 size={14}/> অনুমোদন</button>
   <button className="btn sm danger" disabled={working} onClick={()=>act("guardian.reject",item.id)}><XCircle size={14}/> বাতিল</button></div></div>
 </article>)}</div>}
 </section>
}
