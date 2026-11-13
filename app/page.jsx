import Link from "next/link";
import { ArrowRight, BookOpenCheck, FileText, GraduationCap, ShieldCheck, Sparkles, BadgeCheck } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import NoticeBoard from "../components/NoticeBoard";
import RoutineBoard from "../components/RoutineBoard";
import SchoolPhoto from "../components/SchoolPhoto";
import "./home.css";

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
     <span className="hmrs-home-visual-orbit" aria-hidden="true"><GraduationCap size={28}/></span>
    </div>
   </div>
  </section>
  <section className="container hmrs-home-notices" id="notices">
   <div className="hmrs-home-section-heading"><div><span className="hmrs-home-eyebrow">LATEST UPDATES</span><h2 className="section-title">বিদ্যালয়ের সর্বশেষ খবর</h2><p>গুরুত্বপূর্ণ নোটিশ ও বিজ্ঞপ্তি</p></div></div>
   <NoticeBoard/>
  </section>
  <div className="hmrs-home-routines"><RoutineBoard/></div>
 </main><SiteFooter/></>;
}
