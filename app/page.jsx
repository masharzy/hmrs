import Link from "next/link";
import { ArrowRight, Bell, BookOpenCheck, CalendarCheck, CalendarDays, ClipboardList, FileText, GraduationCap, MapPin, Megaphone, School, ShieldCheck, Sparkles, UserCog, UserPlus, Users } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import NoticeBoard from "../components/NoticeBoard";
import SchoolGallery from "../components/SchoolGallery";
import HomeSchoolDescription from "../components/HomeSchoolDescription";
import HomeLeadership from "../components/HomeLeadership";
import HomeTeachers from "../components/HomeTeachers";
import HomeTopBar from "../components/HomeTopBar";
import "./home.css";

const services=[
 {href:"/login",tag:"ADMIN",title:"প্রশাসনিক লগইন",text:"প্রধান শিক্ষক, সহকারী প্রধান শিক্ষক, স্টাফ ম্যানেজার ও শিক্ষক",Icon:UserCog},
 {href:"/login/guardian",tag:"GUARDIAN",title:"অভিভাবক লগইন",text:"সন্তানের বকেয়া, ফলাফল ও হাজিরা",Icon:Users},
 {href:"/login/student",tag:"STUDENT",title:"শিক্ষার্থী লগইন",text:"ফলাফল, হাজিরা ও ব্যক্তিগত তথ্য",Icon:GraduationCap},
 {href:"#notices",tag:"NOTICE",title:"নোটিশ বোর্ড",text:"বিদ্যালয়ের সর্বশেষ বিজ্ঞপ্তি",Icon:Bell}
];
const admissionLink={href:"/admission"};
const features=[
 {c:"#2549e8",Icon:FileText,title:"ফলাফল ও মার্কশিট",text:"পরীক্ষার ফলাফল ও মার্কশিট নিরাপদে দেখুন।"},
 {c:"#007a5e",Icon:CalendarCheck,title:"হাজিরা",text:"শিক্ষার্থীর উপস্থিতির হালনাগাদ তথ্য।"},
 {c:"#6a3de8",Icon:CalendarDays,title:"ক্লাস ও পরীক্ষার রুটিন",text:"শ্রেণিভিত্তিক রুটিন এক জায়গায়।"},
 {c:"#d92d5b",Icon:Megaphone,title:"নোটিশ ও বিজ্ঞপ্তি",text:"গুরুত্বপূর্ণ ঘোষণা সঙ্গে সঙ্গে।"}
];
const classes=[["৬ষ্ঠ","#2549e8"],["৭ম","#007a5e"],["৮ম","#6a3de8"],["৯ম","#d98a00"],["১০ম","#d92d5b"]];
const groups=[
 {name:"বিজ্ঞান",c:"#2549e8",bg:"#eef2ff",subjects:["পদার্থবিজ্ঞান","রসায়ন","জীববিজ্ঞান","উচ্চতর গণিত"]},
 {name:"ব্যবসায় শিক্ষা",c:"#007a5e",bg:"#e9f7f3",subjects:["হিসাববিজ্ঞান","ফিন্যান্স ও ব্যাংকিং","ব্যবসায় উদ্যোগ"]},
 {name:"মানবিক",c:"#6a3de8",bg:"#f1ecff",subjects:["ইতিহাস","ভূগোল ও পরিবেশ","পৌরনীতি"]}
];
const stats=[["৬ষ্ঠ–১০ম","শ্রেণি"],["৩টি","বিভাগ"],["১১২৩৫৯","EIIN"],["সোনারগাঁ","নারায়ণগঞ্জ"]];

export default function Home(){
 return <><SiteHeader/><main className="hmrs-home hmrs-home-redesign hmrs-home-final">
  <HomeTopBar/>
  <section className="hmrs-home-hero"><div className="container hmrs-home-hero-grid">
   <div>
    <div className="hmrs-home-identity"><MapPin size={16}/> পঞ্চবটি, আনন্দবাজার, সোনারগাঁ, নারায়ণগঞ্জ · EIIN: ১১২৩৫৯</div>
    <span className="hmrs-home-pill">আমাদের ডিজিটাল বিদ্যালয়ে স্বাগতম</span>
    <h1 className="hmrs-home-title">শিখব আনন্দে,<br/><span>এগিয়ে যাব একসাথে।</span></h1>
    <HomeSchoolDescription/>
    <div className="hmrs-home-actions"><Link className="btn hmrs-home-primary" href="/admission">ভর্তির আবেদন করুন <ArrowRight size={18}/></Link><Link className="btn hmrs-home-secondary" href="#services"><BookOpenCheck size={17}/> সকল সেবা দেখুন</Link></div>
    <div className="hmrs-home-highlights">
     <span><i style={{background:"#2549e8"}}><ShieldCheck size={18}/></i> নিরাপদ তথ্যব্যবস্থা</span>
     <span><i style={{background:"#007a5e"}}><Users size={18}/></i> শিক্ষার্থী ও শিক্ষক সেবা</span>
     <span><i style={{background:"#6a3de8"}}><Sparkles size={18}/></i> শিক্ষা • শৃঙ্খলা • মানবিকতা</span>
    </div>
   </div>
   <div className="hmrs-home-visual">
    <div className="hmrs-home-photo"><SchoolGallery/>
    <span className="hmrs-home-orbit"><GraduationCap size={40}/></span>
    <span className="hmrs-home-chip hmrs-home-chip-admission">অনলাইন ভর্তি</span>
    <span className="hmrs-home-chip hmrs-home-chip-results">ফলাফল প্রকাশ</span>
    <div className="hmrs-home-school-badge"><span className="hmrs-home-school-icon"><School size={24}/></span><div><strong>আলোকিত আগামীর পথে</strong><small>শিক্ষা • মূল্যবোধ • সৃজনশীলতা</small></div></div>
</div>
  <section className="hmrs-home-services hmrs-home-services-under-photo" id="services"><div className="hmrs-home-section-heading"><div><span className="hmrs-home-eyebrow">DIGITAL SERVICES</span><h2 className="section-title">বিদ্যালয়ের অনলাইন সেবা</h2><p>আপনার প্রয়োজনীয় সেবাটি নির্বাচন করুন</p></div></div>
   <div className="hmrs-home-quick-grid">{services.map(({href,tag,title,text,Icon},i)=><Link className={"hmrs-home-quick-card hmrs-home-quick-"+i} href={href} key={href}>
    <span className="hmrs-home-quick-icon"><Icon size={26}/></span><span className="hmrs-home-quick-chip">{tag}</span><strong>{title}</strong><small>{text}</small><span className="hmrs-home-quick-arrow"><ArrowRight size={16}/></span></Link>)}</div>
  </section>
   </div>
  </div></section>
  <section className="container hmrs-home-stats"><div className="hmrs-home-stats-card">{stats.map(([v,l])=><div className="hmrs-home-stat" key={l}><strong>{v}</strong><span>{l}</span></div>)}</div></section>
  <section className="hmrs-home-classes"><div className="container">
   <div className="hmrs-home-section-heading"><div><span className="hmrs-home-eyebrow tone-violet">CLASSES &amp; GROUPS</span><h2 className="section-title">শ্রেণি ও বিভাগ</h2><p>ষষ্ঠ থেকে দশম শ্রেণি পর্যন্ত পাঠদান</p></div></div>
   <div className="hmrs-home-class-row">{classes.map(([n,c])=><div className="hmrs-home-class" key={n} style={{"--c":c}}><strong>{n}</strong><span>শ্রেণি</span></div>)}</div>
   <div className="hmrs-home-groups-label"><ClipboardList size={16} style={{verticalAlign:"-3px"}}/> নবম–দশম শ্রেণির বিভাগসমূহ</div>
   <div className="hmrs-home-groups">{groups.map(g=><div className="hmrs-home-group" key={g.name} style={{"--c":g.c,"--bg":g.bg}}><h3>{g.name}</h3><div>{g.subjects.map(s=><span key={s}>{s}</span>)}</div></div>)}</div>
  </div></section>
  <section className="container hmrs-leadership-section"><div className="hmrs-home-section-heading"><div><span className="hmrs-home-eyebrow tone-violet">SCHOOL LEADERSHIP</span><h2 className="section-title">বিদ্যালয় পরিচালনায় দায়িত্বপ্রাপ্ত</h2><p>প্রধান শিক্ষক, সহকারী প্রধান শিক্ষক ও স্টাফ ম্যানেজমেন্ট</p></div></div><HomeLeadership/></section>
  <HomeTeachers/>
  <section className="container hmrs-home-notices" id="notices"><div className="hmrs-home-section-heading"><div><span className="hmrs-home-eyebrow tone-coral">LATEST UPDATES</span><h2 className="section-title">বিদ্যালয়ের নোটিশ</h2><p>সব নোটিশ এক জায়গায় — স্ক্রল করে দেখুন</p></div></div><NoticeBoard full/></section>
  
 </main><SiteFooter/></>;
}
