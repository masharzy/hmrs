"use client";
import { DashboardRouteLink } from "./DashboardShell";
import { ArrowRight, ArrowUpRight, CalendarCheck2, ClipboardCheck, FilePenLine, FileText, GraduationCap, ShieldCheck, Users, Wallet } from "lucide-react";
import { toAsciiDigits } from "../lib/bangla-numbers";

const links={
 students:{label:"Student Management",desc:"Student records and search",Icon:Users},
 admissions:{label:"Admissions",desc:"Review pending applications",Icon:ClipboardCheck},
 attendance:{label:"Daily Attendance",desc:"Attendance and parent notifications",Icon:CalendarCheck2},
 marks:{label:"Exams & Results",desc:"Marks, reports and publishing",Icon:FilePenLine},
 finance:{label:"Finance",desc:"Accounts and student dues",Icon:Wallet}
};
const metrics=[
 {key:"students",label:"Total Students",Icon:Users,meta:"Enrolled students"},
 {key:"applications",label:"Pending Applications",Icon:ClipboardCheck,meta:"Awaiting approval"},
 {key:"present",label:"Present Today",Icon:CalendarCheck2,meta:"Attendance recorded"},
 {key:"absent",label:"Absent / Left Early",Icon:FileText,meta:"Today's attendance"}
];
export default function DashboardOverview({actor,summary={},routes=[]}){
 const keys=new Set(routes.map(([key])=>key));
 const shortcutKeys=["students","admissions","attendance","marks","finance"].filter(key=>keys.has(key));
 const isPrincipal=actor?.role==="principal";
 return <div className="hmrs-overview">
  <section className="hmrs-overview-hero">
   <div className="hmrs-overview-hero-copy">
    <div className="hmrs-overview-hero-eyebrow"><span className="hmrs-status-dot"/> School Administration</div>
    <h2>Welcome, {actor?.name||"User"}</h2>
    <p>Manage students, admissions, attendance and exams from one place.</p>
    <div className="hmrs-overview-hero-actions">
     <DashboardRouteLink href={keys.has("students")?"/dashboard/students":"/dashboard/overview"} className="hmrs-hero-primary">
      <Users size={17}/> Students <ArrowRight size={16}/>
     </DashboardRouteLink>
     <DashboardRouteLink href={keys.has("admissions")?"/dashboard/admissions":"/dashboard/attendance"} className="hmrs-hero-secondary">
      {keys.has("admissions")?"Admissions":"Daily Attendance"} <ArrowUpRight size={16}/>
     </DashboardRouteLink>
    </div>
   </div>
   <div className="hmrs-hero-graphic" aria-hidden="true"><GraduationCap size={112} strokeWidth={1.1}/></div>
  </section>

  <div className="hmrs-overview-stats">
   {metrics.filter(item=>item.key!=="applications"||keys.has("admissions")).map(({key,label,Icon,meta})=><div className="hmrs-overview-stat" key={key}>
    <div className="hmrs-stat-icon"><Icon size={20}/></div>
    <span className="hmrs-stat-label">{label}</span>
    <strong>{toAsciiDigits(summary[key]??0)}</strong>
    <span className="hmrs-stat-footer">{meta}</span>
   </div>)}
  </div>

  <div className="hmrs-overview-columns">
   <section className="hmrs-overview-module">
    <header className="hmrs-module-heading"><div><span className="hmrs-module-eyebrow">WORKSPACE</span><h3>Quick Actions</h3></div>
     <span className="hmrs-module-count">{toAsciiDigits(shortcutKeys.length)} actions</span></header>
    <div className="hmrs-shortcut-list">{shortcutKeys.map(key=>{
     const {label,desc,Icon}=links[key];
     return <DashboardRouteLink href={"/dashboard/"+key} className="hmrs-shortcut" key={key}>
      <span className="hmrs-shortcut-icon"><Icon size={19}/></span>
      <span className="hmrs-shortcut-info"><strong>{label}</strong><small>{desc}</small></span>
      <ArrowUpRight size={17} className="hmrs-shortcut-arrow"/>
     </DashboardRouteLink>;
    })}</div>
   </section>
   <section className="hmrs-overview-module hmrs-priority-panel">
    <header className="hmrs-module-heading"><div><span className="hmrs-module-eyebrow">TODAY</span><h3>Today's Overview</h3></div>
     <CalendarCheck2 size={19} className="hmrs-module-heading-icon"/></header>
    <div className="hmrs-priority-block">
     <span className="hmrs-priority-icon"><ClipboardCheck size={20}/></span>
     <div><strong>{toAsciiDigits(summary.applications??0)} pending applications</strong>
      <p>{keys.has("admissions")?"Review and approve new admission requests.":"The Head Teacher can review pending applications."}</p>
      {keys.has("admissions")&&<DashboardRouteLink href="/dashboard/admissions">View Applications <ArrowRight size={15}/></DashboardRouteLink>}
     </div>
    </div>
    <div className="hmrs-priority-block">
     <span className="hmrs-priority-icon"><CalendarCheck2 size={20}/></span>
     <div><strong>{toAsciiDigits(summary.present??0)} students marked</strong>
      <p>Review today's present and absent students.</p>
      {keys.has("attendance")&&<DashboardRouteLink href="/dashboard/attendance">View Attendance <ArrowRight size={15}/></DashboardRouteLink>}
     </div>
    </div>
    <div className="hmrs-priority-footer"><ShieldCheck size={16}/>
     {isPrincipal?"You have access to all administrative functions as Head Teacher.":"Only the tasks assigned to your role are shown."}
    </div>
   </section>
  </div>
 </div>;
}
