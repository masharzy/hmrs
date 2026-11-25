import Link from "next/link";
import { ArrowRight, Bell, BookOpenCheck, GraduationCap, MapPin, ShieldCheck, Sparkles, Users, UserCog } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import NoticeBoard from "../components/NoticeBoard";
import SchoolGallery from "../components/SchoolGallery";
import HomeLeadership from "../components/HomeLeadership";
import "./home.css";
export default function Home(){
 return <><SiteHeader/><main className="hmrs-home hmrs-home-redesign">
  <section className="hmrs-school-masthead"><div className="hmrs-school-masthead-glow"/><div className="container hmrs-school-masthead-inner">
   <div className="hmrs-school-crest"><GraduationCap size={36}/></div><div className="hmrs-school-heading">
    <span className="hmrs-home-eyebrow">WELCOME TO OUR SCHOOL</span><h1>হাজী মতিউর রহমান সরকার উচ্চ বিদ্যালয়</h1>
    <p><MapPin size={17}/> পঞ্চবটি, আনন্দবাজার, সোনারগাঁ, নারায়ণগঞ্জ</p><span className="hmrs-school-eiin">EIIN: 112359</span>
   </div><div className="hmrs-school-motto"><Sparkles size={18}/> শিক্ষা • শৃঙ্খলা • মানবিকতা</div>
  </div></section>
  <section className="container hmrs-welcome-panel"><div className="hmrs-welcome-copy">
   <span className="hmrs-home-eyebrow">LEARN · LEAD · SUCCEED</span><h2>শিখব আনন্দে,<br/><span>গড়ব সুন্দর আগামী।</span></h2>
   <p>শিক্ষার্থী, শিক্ষক ও অভিভাবকদের জন্য বিদ্যালয়ের প্রয়োজনীয় তথ্য ও ডিজিটাল সেবা এখন এক জায়গায়।</p>
   <div className="hmrs-home-actions"><Link className="btn hmrs-home-primary" href="/admission">ভর্তির আবেদন <ArrowRight size={18}/></Link><Link className="btn hmrs-home-secondary" href="#school-photos"><BookOpenCheck size={17}/> বিদ্যালয় পরিচিতি</Link></div>
   <div className="hmrs-home-highlights"><span><ShieldCheck size={16}/> নিরাপদ তথ্যব্যবস্থা</span><span><Users size={16}/> শিক্ষার্থী ও শিক্ষক সেবা</span></div>
  </div><SchoolGallery/></section>
  <section className="container hmrs-leadership-section"><div className="hmrs-home-section-heading"><div><span className="hmrs-home-eyebrow">SCHOOL LEADERSHIP</span><h2 className="section-title">বিদ্যালয় পরিচালনায় দায়িত্বপ্রাপ্ত</h2><p>প্রধান শিক্ষক, সহকারী প্রধান শিক্ষক ও স্টাফ ম্যানেজমেন্ট</p></div></div><HomeLeadership/></section>
  <section className="container hmrs-home-services" id="services"><div className="hmrs-home-section-heading"><div><span className="hmrs-home-eyebrow">DIGITAL SERVICES</span><h2 className="section-title">বিদ্যালয়ের অনলাইন সেবা</h2><p>আপনার প্রয়োজনীয় সেবাটি নির্বাচন করুন</p></div></div>
   <div className="hmrs-home-quick-grid hmrs-home-quick-grid-four">
    <Link className="hmrs-home-quick-card hmrs-home-quick-1" href="/login/student"><span className="hmrs-home-quick-icon"><GraduationCap size={23}/></span><strong>শিক্ষার্থী পোর্টাল</strong><small>ফলাফল, হাজিরা ও ব্যক্তিগত তথ্য</small></Link>
    <Link className="hmrs-home-quick-card hmrs-home-quick-2" href="/login/teacher"><span className="hmrs-home-quick-icon"><Users size={23}/></span><strong>শিক্ষক পোর্টাল</strong><small>শ্রেণি, হাজিরা ও নম্বর ব্যবস্থাপনা</small></Link>
    <Link className="hmrs-home-quick-card hmrs-home-quick-3" href="/notices"><span className="hmrs-home-quick-icon"><Bell size={23}/></span><strong>নোটিশ বোর্ড</strong><small>বিদ্যালয়ের সর্বশেষ বিজ্ঞপ্তি</small></Link>
    <Link className="hmrs-home-quick-card hmrs-home-quick-4" href="/login/principal"><span className="hmrs-home-quick-icon"><UserCog size={23}/></span><strong>প্রশাসনিক লগইন</strong><small>অনুমোদিত প্রশাসনিক অ্যাকাউন্ট</small></Link>
   </div>
  </section>
  <section className="container hmrs-home-notices" id="notices"><div className="hmrs-home-section-heading"><div><span className="hmrs-home-eyebrow">LATEST UPDATES</span><h2 className="section-title">বিদ্যালয়ের নোটিশ</h2><p>গুরুত্বপূর্ণ নোটিশ ও ঘোষণা</p></div></div><NoticeBoard full/></section>
 </main><SiteFooter/></>;
}