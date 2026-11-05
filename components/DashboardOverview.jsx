"use client";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarCheck2, ClipboardCheck, FilePenLine, FileText, GraduationCap, ShieldCheck, Users, Wallet } from "lucide-react";
import { toBanglaDigits } from "../lib/bangla-numbers";

const links={
 students:{label:"শিক্ষার্থী পরিচালনা",desc:"তালিকা, অনুসন্ধান ও বিস্তারিত তথ্য",Icon:Users},
 admissions:{label:"ভর্তি আবেদন",desc:"অপেক্ষমাণ আবেদন যাচাই ও অনুমোদন",Icon:ClipboardCheck},
 attendance:{label:"দৈনিক হাজিরা",desc:"উপস্থিতি ও অভিভাবকের বার্তা",Icon:CalendarCheck2},
 marks:{label:"পরীক্ষা ও ফলাফল",desc:"নম্বর প্রদান, নম্বরপত্র ও প্রকাশ",Icon:FilePenLine},
 finance:{label:"আয়-ব্যয় হিসাব",desc:"হিসাব ও শিক্ষার্থীর বকেয়া",Icon:Wallet}
};
const metrics=[
 {key:"students",label:"মোট শিক্ষার্থী",Icon:Users,meta:"ভর্তিকৃত শিক্ষার্থী"},
 {key:"applications",label:"অপেক্ষমাণ আবেদন",Icon:ClipboardCheck,meta:"অনুমোদন বাকি"},
 {key:"present",label:"আজ উপস্থিত",Icon:CalendarCheck2,meta:"হাজিরা চিহ্নিত"},
 {key:"absent",label:"অনুপস্থিত / বহির্গমন",Icon:FileText,meta:"আজকের হাজিরা"}
];
export default function DashboardOverview({actor,summary={},routes=[]}){
 const keys=new Set(routes.map(([key])=>key));
 const shortcutKeys=["students","admissions","attendance","marks","finance"].filter(key=>keys.has(key));
 const isPrincipal=actor?.role==="principal";
 return <div className="hmrs-overview">
  <section className="hmrs-overview-hero">
   <div className="hmrs-overview-hero-copy">
    <div className="hmrs-overview-hero-eyebrow"><span className="hmrs-status-dot"/> বিদ্যালয়ের পরিচালনা কেন্দ্র</div>
    <h2>স্বাগতম, {actor?.name||"ব্যবহারকারী"}</h2>
    <p>শিক্ষার্থী, ভর্তি, হাজিরা এবং পরীক্ষার প্রয়োজনীয় তথ্য এখান থেকেই পরিচালনা করুন।</p>
    <div className="hmrs-overview-hero-actions">
     <Link href={keys.has("students")?"/dashboard/students":"/dashboard/overview"} className="hmrs-hero-primary">
      <Users size={17}/> শিক্ষার্থী তালিকা <ArrowRight size={16}/>
     </Link>
     <Link href={keys.has("admissions")?"/dashboard/admissions":"/dashboard/attendance"} className="hmrs-hero-secondary">
      {keys.has("admissions")?"ভর্তি আবেদন":"দৈনিক হাজিরা"} <ArrowUpRight size={16}/>
     </Link>
    </div>
   </div>
   <div className="hmrs-hero-graphic" aria-hidden="true"><GraduationCap size={112} strokeWidth={1.1}/></div>
  </section>

  <div className="hmrs-overview-stats">
   {metrics.map(({key,label,Icon,meta})=><div className="hmrs-overview-stat" key={key}>
    <div className="hmrs-stat-icon"><Icon size={20}/></div>
    <span className="hmrs-stat-label">{label}</span>
    <strong>{toBanglaDigits(summary[key]??0)}</strong>
    <span className="hmrs-stat-footer">{meta}</span>
   </div>)}
  </div>

  <div className="hmrs-overview-columns">
   <section className="hmrs-overview-module">
    <header className="hmrs-module-heading"><div><span className="hmrs-module-eyebrow">WORKSPACE</span><h3>দ্রুত কাজ</h3></div>
     <span className="hmrs-module-count">{toBanglaDigits(shortcutKeys.length)}টি কার্যক্রম</span></header>
    <div className="hmrs-shortcut-list">{shortcutKeys.map(key=>{
     const {label,desc,Icon}=links[key];
     return <Link href={"/dashboard/"+key} className="hmrs-shortcut" key={key}>
      <span className="hmrs-shortcut-icon"><Icon size={19}/></span>
      <span className="hmrs-shortcut-info"><strong>{label}</strong><small>{desc}</small></span>
      <ArrowUpRight size={17} className="hmrs-shortcut-arrow"/>
     </Link>;
    })}</div>
   </section>
   <section className="hmrs-overview-module hmrs-priority-panel">
    <header className="hmrs-module-heading"><div><span className="hmrs-module-eyebrow">TODAY</span><h3>আজকের অবস্থা</h3></div>
     <CalendarCheck2 size={19} className="hmrs-module-heading-icon"/></header>
    <div className="hmrs-priority-block">
     <span className="hmrs-priority-icon"><ClipboardCheck size={20}/></span>
     <div><strong>{toBanglaDigits(summary.applications??0)}টি অপেক্ষমাণ আবেদন</strong>
      <p>{keys.has("admissions")?"নতুন ভর্তি আবেদন যাচাই ও অনুমোদন করুন।":"প্রয়োজনীয় তথ্য প্রধান শিক্ষক যাচাই করবেন।"}</p>
      {keys.has("admissions")&&<Link href="/dashboard/admissions">আবেদন দেখুন <ArrowRight size={15}/></Link>}
     </div>
    </div>
    <div className="hmrs-priority-block">
     <span className="hmrs-priority-icon"><CalendarCheck2 size={20}/></span>
     <div><strong>{toBanglaDigits(summary.present??0)} জনের হাজিরা চিহ্নিত</strong>
      <p>আজকের উপস্থিতি ও অনুপস্থিতি তালিকা দেখুন।</p>
      {keys.has("attendance")&&<Link href="/dashboard/attendance">হাজিরা দেখুন <ArrowRight size={15}/></Link>}
     </div>
    </div>
    <div className="hmrs-priority-footer"><ShieldCheck size={16}/>
     {isPrincipal?"প্রধান শিক্ষক হিসেবে সব প্রশাসনিক কার্যক্রমে আপনার অনুমতি আছে।":"আপনার নির্ধারিত দায়িত্ব অনুযায়ী কার্যক্রমগুলো দেখানো হচ্ছে।"}
    </div>
   </section>
  </div>
 </div>;
}
