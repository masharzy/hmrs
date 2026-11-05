"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronRight, GraduationCap, LayoutDashboard, LogOut, Menu, RefreshCw, School, X } from "lucide-react";

const descriptions={
 overview:"সবচেয়ে গুরুত্বপূর্ণ তথ্য ও দৈনন্দিন কাজ এক জায়গায়",
 students:"শিক্ষার্থী খুঁজুন, তথ্য দেখুন এবং প্রয়োজনীয় পরিবর্তন করুন",
 admissions:"ভর্তি আবেদন, যাচাই ও অনুমোদন",
 attendance:"তারিখ অনুযায়ী শিক্ষার্থীদের হাজিরা পরিচালনা",
 marks:"পরীক্ষা তৈরি, নম্বর প্রদান ও ফলাফল প্রকাশ",
 finance:"প্রতিষ্ঠানের আর্থিক হিসাব ও বকেয়া",
 notices:"বিদ্যালয়ের নোটিশ তৈরি এবং প্রকাশ",
 accounts:"শিক্ষক ও শ্রেণি শিক্ষকের অ্যাকাউন্ট",
 security:"লগইন নিরাপত্তা ও অ্যাকাউন্ট নিয়ন্ত্রণ",
 settings:"হোমপেজ এবং প্রতিষ্ঠানের তথ্য",
 records:"নিজের উপস্থিতি ও পাওনার বিবরণ",
 results:"পরীক্ষার ফলাফল ও নম্বরপত্র"
};
const workRoutes=new Set(["overview","students","admissions","attendance","marks","records","results"]);
const navGroups=(items)=>[
 {label:"মূল কার্যক্রম",items:items.filter(([key])=>workRoutes.has(key))},
 {label:"পরিচালনা ও সেটিংস",items:items.filter(([key])=>!workRoutes.has(key))}
].filter(group=>group.items.length);
const mainDockKeys=["overview","students","admissions","attendance","records","results"];

export default function DashboardShell({actor,roleName,routes,active,loading=false,onNavigate,onRefresh,onLogout,children}){
 const [menuOpen,setMenuOpen]=useState(false);
 const activeItem=routes.find(([key])=>key===active);
 const heading=activeItem?.[1]||"ড্যাশবোর্ড";
 const groups=useMemo(()=>navGroups(routes),[routes]);
 const dock=routes.filter(([key])=>mainDockKeys.includes(key)).slice(0,4);
 const isDockActive=dock.some(([key])=>key===active);
 const today=new Date().toLocaleDateString("bn-BD",{timeZone:"Asia/Dhaka",day:"numeric",month:"long",year:"numeric"});
 useEffect(()=>{setMenuOpen(false)},[active]);
 function navigation(){
  return <nav className="hmrs-console-navigation" aria-label="ড্যাশবোর্ড নেভিগেশন">
   {groups.map(group=><div className="hmrs-navigation-group" key={group.label}>
    <div className="hmrs-navigation-label">{group.label}</div>
    {group.items.map(([key,label,Icon])=><Link href={"/dashboard/"+key} prefetch key={key}
     className={"hmrs-console-link"+(active===key?" is-active":"")}
     aria-current={active===key?"page":undefined}
     onClick={()=>{setMenuOpen(false);onNavigate?.()}}>
     <Icon size={18} strokeWidth={active===key?2.3:1.9}/><span>{label}</span>
     {active===key&&<span className="hmrs-nav-selected" aria-hidden="true"/>}
    </Link>)}
   </div>)}
  </nav>;
 }
 return <div className="hmrs-console">
  <aside className="hmrs-console-sidebar" aria-label="প্রশাসনিক সাইডবার">
   <Link href="/dashboard/overview" className="hmrs-console-brand" onClick={onNavigate}>
    <span className="hmrs-brand-emblem"><GraduationCap size={24}/></span>
    <span><strong>HMRS</strong><small>School Administration</small></span>
   </Link>
   {navigation()}
   <div className="hmrs-sidebar-bottom">
    <div className="hmrs-sidebar-user"><span className="hmrs-user-avatar">{(actor.name||"অ").slice(0,1)}</span>
     <span className="hmrs-user-details"><strong>{actor.name||"ব্যবহারকারী"}</strong><small>{roleName}</small></span>
    </div>
    <div className="hmrs-sidebar-actions">
     <Link href="/" className="hmrs-console-small-link"><School size={16}/> ওয়েবসাইটে ফিরুন</Link>
     <button type="button" onClick={onLogout} className="hmrs-console-small-link"><LogOut size={16}/> লগআউট</button>
    </div>
   </div>
  </aside>
  <div className="hmrs-console-workspace">
   <header className="hmrs-console-topbar">
    <div className="hmrs-topbar-location">
     <button className="hmrs-topbar-menu" type="button" onClick={()=>setMenuOpen(true)} aria-label="নেভিগেশন খুলুন"><Menu size={21}/></button>
     <span className="hmrs-topbar-home"><LayoutDashboard size={16}/> ম্যানেজমেন্ট</span>
     <ChevronRight size={15} className="hmrs-topbar-separator"/>
     <strong>{heading}</strong>
    </div>
    <div className="hmrs-topbar-tools">
     <span className="hmrs-topbar-date"><CalendarDays size={16}/>{today}</span>
     <span className="hmrs-topbar-role">{roleName}</span>
     <button type="button" className="hmrs-topbar-logout" onClick={onLogout} title="লগআউট" aria-label="লগআউট"><LogOut size={18}/></button>
    </div>
    {loading&&<div className="hmrs-top-progress" role="progressbar" aria-label="ডেটা লোড হচ্ছে"/>}
   </header>
   <main className="hmrs-console-main" id="dashboard-main">
    <div className="hmrs-console-pagehead">
     <div className="hmrs-pagehead-copy"><span className="hmrs-pagehead-eyebrow">বিদ্যালয় পরিচালনা <span aria-hidden="true">/</span> {roleName}</span>
      <h1>{heading}</h1><p>{descriptions[active]||"প্রয়োজনীয় তথ্য ও কার্যক্রম"}</p>
     </div>
     <button className="hmrs-pagehead-refresh" type="button" onClick={onRefresh} title="তথ্য রিফ্রেশ করুন" aria-label="তথ্য রিফ্রেশ করুন">
      <RefreshCw size={17}/>
     </button>
    </div>
    {children}
   </main>
  </div>
  <nav className="hmrs-mobile-dock" aria-label="দ্রুত নেভিগেশন">
   {dock.map(([key,label,Icon])=><Link key={key} className={"hmrs-dock-item"+(key===active?" is-active":"")} href={"/dashboard/"+key} aria-current={key===active?"page":undefined} onClick={onNavigate}>
    <Icon size={19}/><span>{label}</span></Link>)}
   <button type="button" className={"hmrs-dock-item"+(!isDockActive?" is-active":"")} aria-expanded={menuOpen} aria-controls="hmrs-mobile-drawer" onClick={()=>setMenuOpen(true)}><Menu size={20}/><span>আরও</span></button>
  </nav>
  {menuOpen&&<><button type="button" className="hmrs-drawer-backdrop" onClick={()=>setMenuOpen(false)} aria-label="মেনু বন্ধ করুন"/>
   <div className="hmrs-mobile-drawer" id="hmrs-mobile-drawer" role="dialog" aria-modal="true" aria-label="ড্যাশবোর্ড মেনু">
    <div className="hmrs-drawer-head"><div><b>নেভিগেশন</b><small>{actor.name||roleName}</small></div>
     <button type="button" onClick={()=>setMenuOpen(false)} aria-label="বন্ধ করুন"><X size={21}/></button>
    </div>
    {navigation()}
    <div className="hmrs-drawer-footer"><Link href="/" onClick={()=>setMenuOpen(false)}><ArrowLeft size={16}/> ওয়েবসাইটে ফিরুন</Link>
     <button type="button" onClick={()=>{setMenuOpen(false);onLogout()}}><LogOut size={16}/> লগআউট</button></div>
   </div></>}
 </div>;
}

export function DashboardSkeleton({kind="overview"}){
 const rows=kind==="overview"?4:kind==="students"||kind==="admissions"||kind==="attendance"?5:3;
 return <div className="hmrs-page-skeleton" aria-busy="true" aria-label="পৃষ্ঠা প্রস্তুত হচ্ছে">
  {kind==="overview"&&<div className="hmrs-skeleton-hero hmrs-shimmer"/>}
  <div className="hmrs-skeleton-top">{Array.from({length:kind==="overview"?4:2},(_,i)=><div className="hmrs-shimmer" key={i}/>)}</div>
  <div className="hmrs-skeleton-sheet">{Array.from({length:rows},(_,i)=><div className="hmrs-shimmer" key={i}/>)}</div>
 </div>;
}
