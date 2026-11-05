"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronRight, CalendarDays, X } from "lucide-react";
import { loadPublicData } from "../lib/public-client";

export default function NoticeBoard({compact=false}){
 const [notices,setNotices]=useState([]);
 const [loading,setLoading]=useState(true);
 const [selected,setSelected]=useState(null);
 const closeRef=useRef(null);
 useEffect(()=>{
  let alive=true;
  loadPublicData().then(data=>{if(alive)setNotices(data.notices||[])})
   .catch(()=>{}).finally(()=>{if(alive)setLoading(false)});
  return ()=>{alive=false};
 },[]);
 useEffect(()=>{
  if(!selected)return;
  const oldOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  closeRef.current?.focus();
  const closeOnEscape=event=>{if(event.key==="Escape")setSelected(null)};
  window.addEventListener("keydown",closeOnEscape);
  return ()=>{window.removeEventListener("keydown",closeOnEscape);document.body.style.overflow=oldOverflow};
 },[selected]);
 return <section className="panel notice-board" aria-labelledby="notice-board-title">
  <header className="notice-board-head"><div className="notice-board-heading"><span><Bell size={19}/></span>
   <div><h2 id="notice-board-title">নোটিশ বোর্ড</h2><p>গুরুত্বপূর্ণ বিজ্ঞপ্তি ও সর্বশেষ তথ্য</p></div></div>
   <span className="notice-count">{notices.length?notices.length.toLocaleString("bn-BD")+"টি নোটিশ":"নোটিশ"}</span>
  </header>
  <div className="notice-board-list">
   {loading?<p className="empty">নোটিশ লোড হচ্ছে...</p>
    :!notices.length?<p className="empty">এই মুহূর্তে কোনো প্রকাশিত নোটিশ নেই।</p>
    :notices.slice(0,compact?4:12).map((notice,index)=><button type="button" className="notice-title-row" key={notice.id} onClick={()=>setSelected(notice)}>
     <span className="notice-row-index">{String(index+1).padStart(2,"0")}</span>
     <span className="notice-row-title">{notice.title}</span>
     <span className="notice-open-icon" aria-hidden="true"><ChevronRight size={17}/></span>
    </button>)}
  </div>
  {selected&&<div className="notice-dialog-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setSelected(null)}}>
   <section className="notice-dialog" role="dialog" aria-modal="true" aria-labelledby="full-notice-title">
    <header className="notice-dialog-head"><span className="notice-dialog-symbol"><Bell size={19}/></span><div><span className="notice-dialog-eyebrow">বিদ্যালয়ের বিজ্ঞপ্তি</span>
      <h2 id="full-notice-title">{selected.title}</h2></div>
     <button className="notice-dialog-close" type="button" onClick={()=>setSelected(null)} aria-label="নোটিশ বন্ধ করুন" ref={closeRef}><X size={20}/></button></header>
    <div className="notice-dialog-content">
     {selected.createdAt&&<p className="notice-dialog-date"><CalendarDays size={16}/> {new Date(selected.createdAt).toLocaleDateString("bn-BD",{day:"numeric",month:"long",year:"numeric"})}</p>}
     <div className="notice-dialog-message">{selected.message}</div>
    </div>
    <footer className="notice-dialog-footer"><button type="button" className="btn primary" onClick={()=>setSelected(null)}>বন্ধ করুন</button></footer>
   </section>
  </div>}
 </section>;
}
