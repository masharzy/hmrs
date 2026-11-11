import Link from "next/link";
import { ArrowRight, BookOpenCheck, ClipboardList, FileText, GraduationCap, School, ShieldCheck, UserRound, UsersRound, UserCog, Sparkles, CalendarDays, BadgeCheck } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import NoticeBoard from "../components/NoticeBoard";
import RoutineBoard from "../components/RoutineBoard";
import SchoolPhoto from "../components/SchoolPhoto";
import "./home.css";

const quick = [
 { label:"ভর্তির আবেদন",desc:"অনলাইনে সহজে আবেদন করুন",icon:ClipboardList,href:"/admission" },
 { label:"শিক্ষার্থী লগইন",desc:"ফলাফল, হাজিরা ও পাওনা",icon:GraduationCap,href:"/login/student" },
 { label:"শিক্ষক লগইন",desc:"হাজিরা ও নম্বর প্রদান",icon:UserRound,href:"/login/teacher" },
 { label:"শ্রেণি শিক্ষক",desc:"শ্রেণি ব্যবস্থাপনা",icon:UsersRound,href:"/login/class_teacher" },
 { label:"প্রতিষ্ঠান প্রধান",desc:"প্রশাসনিক ড্যাশবোর্ড",icon:UserCog,href:"/login/principal" }
];

export default function Home(){
 return <><SiteHeader/><main className="hmrs-home">
  <section className="hmrs-home-hero">
   <div className="container hmrs-home-hero-grid">
    <div className="hmrs-home-intro">
     <div className="hmrs-home-pill"><Sparkles size={15}/> প্রযুক্তিনির্ভর, শিক্ষার্থীবান্ধব বিদ্যালয়</div>
     <h1 className="hmrs-home-title">জ্ঞান, শৃঙ্খলা ও<br/><span>আলোকিত আগামী।</span></h1>
     <p className="hmrs-home-lead">হাজী মতিউর রহমান সরকার উচ্চ বিদ্যালয়ে স্বাগতম। ভর্তি থেকে ফলাফল—শিক্ষার্থী, শিক্ষক ও অভিভাবকদের জন্য এক সুন্দর ডিজিটাল প্ল্যাটফর্ম।</p>
     <div className="hmrs-home-actions">
      <Link className="btn hmrs-home-primary" href="/admission">ভর্তির আবেদন করুন <ArrowRight size={17}/></Link>
      <Link className="btn hmrs-home-secondary" href="#notices"><FileText size={17}/> নোটিশ দেখুন</Link>
     </div>
     <div className="hmrs-home-highlights">
      <span><ShieldCheck size={17}/> নিরাপদ তথ্য ব্যবস্থাপনা</span>
      <span><BookOpenCheck size={17}/> ৬ষ্ঠ–১০ম শ্রেণি</span>
      <span><BadgeCheck size={17}/> সহজ অনলাইন সেবা</span>
     </div>
    </div>
    <div className="hmrs-home-visual">
     <div className="hmrs-home-photo"><SchoolPhoto/></div>
     <div className="hmrs-home-school-badge"><span className="hmrs-home-school-icon"><School size={20}/></span>
      <span><strong>হাজী মতিউর রহমান সরকার উচ্চ বিদ্যালয়</strong><small>সোনারগাঁ, নারায়ণগঞ্জ · EIIN ১১২৩৫৯</small></span></div>
     <span className="hmrs-home-visual-orbit" aria-hidden="true"><GraduationCap size={28}/></span>
    </div>
   </div>
  </section>
  <section className="container hmrs-home-services" id="quick-access">
   <div className="hmrs-home-section-heading"><div><span className="hmrs-home-eyebrow">DIGITAL SERVICES</span>
    <h2 className="section-title">আপনার প্রয়োজনীয় সেবাসমূহ</h2><p>প্রয়োজনীয় সব সেবায় দ্রুত প্রবেশ করুন</p></div></div>
   <div className="hmrs-home-quick-grid">
    {quick.map((item,index)=><Link key={item.href} href={item.href} className={"hmrs-home-quick-card hmrs-home-quick-"+index}>
     <div className="hmrs-home-quick-top"><span className="hmrs-home-quick-icon"><item.icon size={23}/></span><ArrowRight size={18} className="hmrs-home-quick-arrow"/></div>
     <strong>{item.label}</strong><small>{item.desc}</small>
    </Link>)}
   </div>
  </section>
  <section className="container hmrs-home-notices" id="notices">
   <div className="hmrs-home-section-heading"><div><span className="hmrs-home-eyebrow">LATEST UPDATES</span><h2 className="section-title">বিদ্যালয়ের সর্বশেষ খবর</h2><p>গুরুত্বপূর্ণ নোটিশ ও বিজ্ঞপ্তি</p></div></div>
   <NoticeBoard/>
  </section>
  <div className="hmrs-home-routines"><RoutineBoard/></div>
  <section className="container hmrs-home-final">
   <div className="hmrs-home-final-card">
    <div className="hmrs-home-final-icon"><CalendarDays size={28}/></div>
    <div><span className="hmrs-home-final-kicker">ADMISSIONS</span><h2>নতুন শিক্ষার্থী ভর্তির আবেদন</h2><p>শিক্ষার্থীর তথ্য দিয়ে সহজেই অনলাইনে আবেদন সম্পন্ন করুন।</p></div>
    <Link href="/admission" className="btn hmrs-home-final-button">আবেদন ফর্ম <ArrowRight size={16}/></Link>
   </div>
  </section>
 </main><SiteFooter/></>;
}
