"use client";
import { useEffect, useState } from "react";
import { Bell, CalendarDays, ArrowUpRight } from "lucide-react";
export default function NoticeBoard({compact=false}){
 const [notices,setNotices]=useState([]),[loading,setLoading]=useState(true);
 useEffect(()=>{fetch("/api/public",{cache:"no-store"}).then(r=>r.json()).then(d=>setNotices(d.notices||[])).catch(()=>{}).finally(()=>setLoading(false))},[]);
 return <div className="panel" style={{padding:compact?20:26}}>
  <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Bell size={19} color="#176b61"/><h2 style={{fontSize:18,fontWeight:800,margin:0}}>নোটিশ বোর্ড</h2></div><span className="chip">সর্বশেষ আপডেট</span></div>
  {loading?<div className="empty">নোটিশ লোড হচ্ছে...</div>:notices.length===0?<div className="empty">এই মুহূর্তে কোনো প্রকাশিত নোটিশ নেই।</div>:
   notices.slice(0,compact?4:12).map(n=><article className="notice-row" key={n.id}>
     <div style={{background:"#eff7f4",color:"#176b61",padding:10,borderRadius:6,height:39}}><CalendarDays size={18}/></div>
     <div style={{flex:1,minWidth:0}}><b className="block text-sm">{n.title}</b><p className="muted mt-1 mb-0 text-xs whitespace-pre-wrap">{n.message}</p><small className="muted">{n.createdAt?new Date(n.createdAt).toLocaleDateString("bn-BD"):""}</small></div><ArrowUpRight size={15} color="#91a09e"/>
   </article>)}
 </div>;
}