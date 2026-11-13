"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronRight, GraduationCap, LayoutDashboard, LogOut, Menu, RefreshCw, School, X } from "lucide-react";

const descriptions={
 overview:"Key information and daily tasks in one place",
 students:"Find students, review records and update details",
 admissions:"Review and approve admission applications",
 attendance:"Manage daily attendance by date",
 marks:"Create exams, enter marks and publish results",
 finance:"School finances and outstanding dues",
 notices:"Create and publish school notices",
 routines:"Manage class and exam timetables",
 accounts:"Teacher and class teacher accounts",
 security:"Login security and account management",
 settings:"Home page and school information",
 records:"Your attendance and outstanding dues",
 results:"Exam results and marksheets",
 profile:"Your PIN and account security"
};
const workRoutes=new Set(["overview","students","admissions","attendance","marks","routines","records","results"]);
const navGroups=(items)=>[
 {label:"Main Menu",items:items.filter(([key])=>workRoutes.has(key))},
 {label:"Administration & Settings",items:items.filter(([key])=>!workRoutes.has(key))}
].filter(group=>group.items.length);
const mainDockKeys=["overview","students","admissions","attendance","records","results"];

const dashboardPaths=new Set(["overview","students","admissions","attendance","marks","finance","notices","routines","accounts","security","settings","records","results","profile"]);

// Use Next.js-integrated native history to avoid an extra RSC route request.
// Regular href remains usable for accessibility, refresh, and modified clicks.
export function DashboardRouteLink({href,children,onNavigate,...rest}){
 function activate(event){
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  if(typeof href!=="string"||!href.startsWith("/dashboard/"))return;
  if(!dashboardPaths.has(href.slice("/dashboard/".length)))return;
  event.preventDefault();
  if(window.location.pathname!==href)window.history.pushState(null,"",href);
  onNavigate?.();
 }
 return <a {...rest} href={href} onClick={activate}>{children}</a>;
}

export default function DashboardShell({actor,roleName,routes,active,loading=false,onNavigate,onRefresh,onLogout,children}){
 const [menuOpen,setMenuOpen]=useState(false);
 const drawerCloseButton=useRef(null);
 const activeItem=routes.find(([key])=>key===active);
 const heading=activeItem?.[1]||"Dashboard";
 const groups=useMemo(()=>navGroups(routes),[routes]);
 const dock=routes.filter(([key])=>mainDockKeys.includes(key)).slice(0,4);
 const isDockActive=dock.some(([key])=>key===active);
 const today=new Date().toLocaleDateString("en-GB",{timeZone:"Asia/Dhaka",day:"numeric",month:"long",year:"numeric"});
 useEffect(()=>{setMenuOpen(false)},[active]);
 useEffect(()=>{
  if(!menuOpen)return;
  const previous=document.activeElement;
  const oldOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  drawerCloseButton.current?.focus();
  const onKeyDown=(event)=>{
   if(event.key==="Escape"){event.preventDefault();setMenuOpen(false)}
  };
  document.addEventListener("keydown",onKeyDown);
  return ()=>{
   document.body.style.overflow=oldOverflow;
   document.removeEventListener("keydown",onKeyDown);
   if(previous && typeof previous.focus==="function")previous.focus();
  };
 },[menuOpen]);
 function navigation(){
  return <nav className="hmrs-console-navigation" aria-label="Dashboard Navigation">
   {groups.map(group=><div className="hmrs-navigation-group" key={group.label}>
    <div className="hmrs-navigation-label">{group.label}</div>
    {group.items.map(([key,label,Icon])=><DashboardRouteLink href={"/dashboard/"+key} key={key}
     className={"hmrs-console-link"+(active===key?" is-active":"")}
     aria-current={active===key?"page":undefined}
     onNavigate={()=>{setMenuOpen(false);onNavigate?.()}}>
     <Icon size={18} strokeWidth={active===key?2.3:1.9}/><span>{label}</span>
     {active===key&&<span className="hmrs-nav-selected" aria-hidden="true"/>}
    </DashboardRouteLink>)}
   </div>)}
  </nav>;
 }
 return <div className="hmrs-console">
  <aside className="hmrs-console-sidebar" aria-label="Admin Sidebar">
   <DashboardRouteLink href="/dashboard/overview" className="hmrs-console-brand" onNavigate={onNavigate}>
    <span className="hmrs-brand-emblem"><GraduationCap size={24}/></span>
    <span><strong>HMRS</strong><small>School Administration</small></span>
   </DashboardRouteLink>
   {navigation()}
   <div className="hmrs-sidebar-bottom">
    <div className="hmrs-sidebar-user"><span className="hmrs-user-avatar">{(actor.name||"U").slice(0,1)}</span>
     <span className="hmrs-user-details"><strong>{actor.name||"User"}</strong><small>{roleName}</small></span>
    </div>
    <div className="hmrs-sidebar-actions">
     <Link href="/" className="hmrs-console-small-link"><School size={16}/> Back to Website</Link>
     <button type="button" onClick={onLogout} className="hmrs-console-small-link"><LogOut size={16}/> Log Out</button>
    </div>
   </div>
  </aside>
  <div className="hmrs-console-workspace">
   <header className="hmrs-console-topbar">
    <div className="hmrs-topbar-location">
     <button className="hmrs-topbar-menu" type="button" onClick={()=>setMenuOpen(true)} aria-label="Open Navigation"><Menu size={21}/></button>
     <span className="hmrs-topbar-home"><LayoutDashboard size={16}/> Management</span>
     <ChevronRight size={15} className="hmrs-topbar-separator"/>
     <strong>{heading}</strong>
    </div>
    <div className="hmrs-topbar-tools">
     <span className="hmrs-topbar-date"><CalendarDays size={16}/>{today}</span>
     <span className="hmrs-topbar-role">{roleName}</span>
     <button type="button" className="hmrs-topbar-logout" onClick={onLogout} title="Log Out" aria-label="Log Out"><LogOut size={18}/></button>
    </div>
    {loading&&<div className="hmrs-top-progress" role="progressbar" aria-label="Loading data"/>}
   </header>
   <main className="hmrs-console-main" id="dashboard-main">
    <div className="hmrs-console-pagehead">
     <div className="hmrs-pagehead-copy"><span className="hmrs-pagehead-eyebrow">School Management <span aria-hidden="true">/</span> {roleName}</span>
      <h1>{heading}</h1><p>{descriptions[active]||"Information and Activities"}</p>
     </div>
     <button className="hmrs-pagehead-refresh" type="button" onClick={onRefresh} title="Refresh Data" aria-label="Refresh Data">
      <RefreshCw size={17}/>
     </button>
    </div>
    {children}
   </main>
  </div>
  <nav className="hmrs-mobile-dock" aria-label="Quick Navigation">
   {dock.map(([key,label,Icon])=><DashboardRouteLink key={key} className={"hmrs-dock-item"+(key===active?" is-active":"")} href={"/dashboard/"+key} aria-current={key===active?"page":undefined} onNavigate={onNavigate}>
    <Icon size={19}/><span>{label}</span></DashboardRouteLink>)}
   <button type="button" className={"hmrs-dock-item"+(!isDockActive?" is-active":"")} aria-expanded={menuOpen} aria-controls="hmrs-mobile-drawer" onClick={()=>setMenuOpen(true)}><Menu size={20}/><span>More</span></button>
  </nav>
  {menuOpen&&<><button type="button" className="hmrs-drawer-backdrop" onClick={()=>setMenuOpen(false)} aria-label="Close Menu"/>
   <div className="hmrs-mobile-drawer" id="hmrs-mobile-drawer" role="dialog" aria-modal="true" aria-label="Dashboard Menu">
    <div className="hmrs-drawer-head"><div><b>Navigation</b><small>{actor.name||roleName}</small></div>
     <button ref={drawerCloseButton} type="button" onClick={()=>setMenuOpen(false)} aria-label="Close"><X size={21}/></button>
    </div>
    {navigation()}
    <div className="hmrs-drawer-footer"><Link href="/" onClick={()=>setMenuOpen(false)}><ArrowLeft size={16}/> Back to Website</Link>
     <button type="button" onClick={()=>{setMenuOpen(false);onLogout()}}><LogOut size={16}/> Log Out</button></div>
   </div></>}
 </div>;
}

export function DashboardSkeleton({kind="overview"}){
 const rows=kind==="overview"?4:kind==="students"||kind==="admissions"||kind==="attendance"?5:3;
 return <div className="hmrs-page-skeleton" aria-busy="true" aria-label="Loading Page">
  {kind==="overview"&&<div className="hmrs-skeleton-hero hmrs-shimmer"/>}
  <div className="hmrs-skeleton-top">{Array.from({length:kind==="overview"?4:2},(_,i)=><div className="hmrs-shimmer" key={i}/>)}</div>
  <div className="hmrs-skeleton-sheet">{Array.from({length:rows},(_,i)=><div className="hmrs-shimmer" key={i}/>)}</div>
 </div>;
}
