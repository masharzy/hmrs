"use client";
import { useEffect, useState } from "react";
import { CalendarRange, Download, Maximize2, X } from "lucide-react";
import { loadPublicData } from "../lib/public-client";
import { routineGradeLabel } from "../lib/routines";

export default function RoutineBoard(){
 const [routines,setRoutines]=useState([]);
 const [loading,setLoading]=useState(true);
 const [selected,setSelected]=useState(null);
 useEffect(()=>{
  let alive=true;
  loadPublicData().then(data=>{if(alive)setRoutines(data.routines||[])})
   .catch(()=>{}).finally(()=>{if(alive)setLoading(false)});
  return ()=>{alive=false};
 },[]);
 useEffect(()=>{
  if(!selected)return;
  const oldOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  const onKey=event=>{if(event.key==="Escape")setSelected(null)};
  window.addEventListener("keydown",onKey);
  return ()=>{window.removeEventListener("keydown",onKey);document.body.style.overflow=oldOverflow};
 },[selected]);
 if(!loading&&!routines.length)return null;
 return <section className="container home-routine-section" id="routines">
  <div className="home-routine-head"><div><span className="kicker">ACADEMIC ROUTINE</span><h2 className="section-title mt-2 mb-1">ক্লাস ও পরীক্ষার রুটিন</h2>
   <p className="muted text-sm mb-0">আপনার শ্রেণির রুটিন দেখতে ছবিতে ক্লিক করুন</p></div></div>
  <div className="home-routines">
   {loading?[0,1,2].map(i=><div className="panel home-routine-skeleton" key={i}/>)
    :routines.map(r=><button className="home-routine-card panel" key={r.id} type="button" onClick={()=>setSelected(r)}>
     <div className="home-routine-thumb"><img src={r.imageUrl} alt={r.title} loading="lazy"/><span><Maximize2 size={16}/> বিস্তারিত দেখুন</span></div>
     <div className="home-routine-details"><small>{r.kind==="exam"?"পরীক্ষার রুটিন":"ক্লাস রুটিন"} · {routineGradeLabel(r.grade,r.group)}</small>
      <strong>{r.title}</strong></div>
    </button>)}
  </div>
  {selected&&<div className="routine-public-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}>
   <section className="routine-public-dialog" role="dialog" aria-modal="true" aria-labelledby="routine-public-title">
    <header><div><span>বিদ্যালয়ের রুটিন</span><h2 id="routine-public-title">{selected.title}</h2>
     <p>{routineGradeLabel(selected.grade,selected.group)}</p></div>
     <button type="button" onClick={()=>setSelected(null)} aria-label="রুটিন বন্ধ করুন"><X size={21}/></button></header>
    <div className="routine-public-image"><img src={selected.imageUrl} alt={selected.title}/></div>
    <footer><a href={selected.imageUrl} className="btn" target="_blank" rel="noopener noreferrer"><Download size={16}/> সম্পূর্ণ ছবিটি খুলুন</a>
     <button className="btn primary" type="button" onClick={()=>setSelected(null)}>বন্ধ করুন</button></footer>
   </section>
  </div>}
 </section>;
}
