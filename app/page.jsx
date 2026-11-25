 "use client";
import Link from "next/link";
import {ArrowRight,ArrowUpRight,BookOpenCheck,FileText,GraduationCap,ShieldCheck,Sparkles,
 BadgeCheck,ClipboardList,UserRound,UsersRound,UserCog,Bell,Stars,CheckCircle2} from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import NoticeBoard from "../components/NoticeBoard";
import SchoolPhoto from "../components/SchoolPhoto";
import "./home.css";
import { useLanguage } from "../components/LanguageProvider";

export default function Home(){
 const {language}=useLanguage(); const en=language==="en";
 const services=[
 {href:"/admission",title:en?"Online Admission":"অনলাইন ভর্তি",desc:en?"Complete your admission application easily":"সহজে ভর্তি আবেদন সম্পন্ন করুন",chip:"ADMISSION",icon:ClipboardList},
 {href:"/login/student",title:en?"Student Portal":"শিক্ষার্থী পোর্টাল",desc:en?"View your results and attendance":"নিজের ফলাফল ও হাজিরা দেখুন",chip:"STUDENTS",icon:UserRound},
 {href:"/login/teacher",title:en?"Teacher Portal":"শিক্ষক পোর্টাল",desc:en?"Manage classes and marks":"শ্রেণি ও নম্বর ব্যবস্থাপনা",chip:"TEACHERS",icon:UsersRound},
 {href:"/login/principal",title:en?"Headteacher":"প্রধান শিক্ষক",desc:en?"School administration and approvals":"বিদ্যালয় পরিচালনা ও অনুমোদন",chip:"ADMIN",icon:UserCog},
 {href:"#notices",title:en?"Notice Board":"নোটিশ বোর্ড",desc:en?"Latest announcements and updates":"নতুন বিজ্ঞপ্তি ও প্রয়োজনীয় খবর",chip:"UPDATES",icon:Bell}
];
 return <><SiteHeader/><main className="hmrs-home">
  <section className="hmrs-home-hero">
   <div className="hmrs-home-decor hmrs-home-decor-one" aria-hidden="true"/>
   <div className="hmrs-home-decor hmrs-home-decor-two" aria-hidden="true"/>
   <div className="container hmrs-home-hero-grid">
    <div className="hmrs-home-intro">
     <div className="hmrs-home-pill"><Sparkles size={15}/> {en?"Welcome to our digital school":"আমাদের ডিজিটাল বিদ্যালয়ে স্বাগতম"} <span className="hmrs-pill-spark" aria-hidden="true">✦</span></div>
     <h1 className="hmrs-home-title">{en?<>Learn with joy,<br/><span>grow together.</span></>:<>শিখব আনন্দে,<br/><span>এগিয়ে যাব একসাথে।</span></>}</h1>
     <p className="hmrs-home-lead">{en?"Haji Matiur Rahman Sarker High School — a simpler digital experience for students, teachers and parents.":"হাজী মতিউর রহমান সরকার উচ্চ বিদ্যালয়—শিক্ষার্থী, শিক্ষক ও অভিভাবকের জন্য আরও সহজ ও সুন্দর ডিজিটাল অভিজ্ঞতা।"}</p>
     <div className="hmrs-home-actions">
      <Link className="btn hmrs-home-primary" href="/admission">{en?"Apply for Admission":"ভর্তির আবেদন করুন"} <ArrowRight size={17}/></Link>
      <Link className="btn hmrs-home-secondary" href="#services"><BookOpenCheck size={17}/> {en?"Explore Services":"সকল সেবা দেখুন"}</Link>
     </div>
     <div className="hmrs-home-highlights">
      <span><CheckCircle2 size={17}/> {en?"Grades 6–10":"৬ষ্ঠ–১০ম শ্রেণি"}</span>
      <span><ShieldCheck size={17}/> {en?"Secure student records":"নিরাপদ শিক্ষার্থী তথ্য"}</span>
      <span><BadgeCheck size={17}/> {en?"Easy online services":"সহজ অনলাইন সেবা"}</span>
     </div>
     <div className="hmrs-home-mini-stat" aria-label="School digital services"><span className="hmrs-stat-orb"><GraduationCap size={19}/></span>
      <div><strong>{en?"All services in one place":"এক জায়গায় সব সেবা"}</strong><small>Admission · Results · Notices</small></div>
      <ArrowUpRight size={17} aria-hidden="true"/>
     </div>
    </div>
    <div className="hmrs-home-visual">
     <div className="hmrs-home-photo"><SchoolPhoto/></div>
     <span className="hmrs-home-visual-orbit" aria-hidden="true"><GraduationCap size={28}/></span>
     <div className="hmrs-home-school-badge">
      <span className="hmrs-home-school-icon"><Sparkles size={20}/></span>
      <span><strong>{en?"Towards a brighter future":"আলোকিত আগামীর পথে"}</strong><small>{en?"Education • Values • Creativity":"শিক্ষা • মূল্যবোধ • সৃজনশীলতা"}</small></span>
     </div>
     <span className="hmrs-home-dot-pattern" aria-hidden="true"/>
    </div>
   </div>
  </section>

  <section className="container hmrs-home-services" id="services">
   <div className="hmrs-home-section-heading"><div>
    <span className="hmrs-home-eyebrow">EXPLORE OUR SERVICES</span>
    <h2 className="section-title">{en?"Services for you":"আপনার প্রয়োজনীয় সেবাগুলো"}</h2>
    <p>{en?"Choose what you would like to do":"যে কাজটি করতে চান, সেটি নির্বাচন করুন"}</p>
   </div><span className="hmrs-home-section-flower" aria-hidden="true"><Sparkles size={21}/></span></div>
   <div className="hmrs-home-quick-grid">
    {services.map((item,index)=><Link className={"hmrs-home-quick-card hmrs-home-quick-"+index} href={item.href} key={item.href}>
      <span className="hmrs-home-quick-top"><span className="hmrs-home-quick-icon"><item.icon size={23}/></span><ArrowUpRight className="hmrs-home-quick-arrow" size={17}/></span>
      <span className="hmrs-home-quick-chip">{item.chip}</span>
      <strong>{item.title}</strong><small>{item.desc}</small>
     </Link>)}
   </div>
  </section>

  <section className="container hmrs-home-notices" id="notices">
   <div className="hmrs-home-section-heading"><div>
    <span className="hmrs-home-eyebrow">LATEST UPDATES</span>
    <h2 className="section-title">{en?"Latest School News":"বিদ্যালয়ের সর্বশেষ খবর"}</h2>
    <p>{en?"Important notices and announcements":"গুরুত্বপূর্ণ নোটিশ ও নতুন বিজ্ঞপ্তি"}</p>
   </div><span className="hmrs-home-notice-mark"><Bell size={19}/></span></div>
   <NoticeBoard full/>
  </section>

  <section className="container hmrs-home-final">
   <div className="hmrs-home-final-card">
    <span className="hmrs-home-final-icon"><GraduationCap size={29}/></span>
    <div><span className="hmrs-home-final-kicker">YOUR NEXT CHAPTER STARTS HERE</span>
      <h2>{en?"Welcome to a new academic year!":"নতুন শিক্ষাবর্ষে তোমাকে স্বাগতম!"}</h2>
      <p>{en?"Apply online in just a few simple steps.":"ভর্তি আবেদন এখন অনলাইনে, মাত্র কয়েকটি সহজ ধাপে।"}</p></div>
    <Link href="/admission" className="btn hmrs-home-final-button">{en?"Apply Now":"ভর্তি আবেদন"} <ArrowRight size={16}/></Link>
   </div>
  </section>
 </main><SiteFooter/></>;
}
