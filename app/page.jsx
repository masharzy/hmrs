import Link from "next/link";
import { ArrowRight, BookOpenCheck, ClipboardList, FileText, GraduationCap, School, ShieldCheck, UserRound, UsersRound, UserCog, Megaphone } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import NoticeBoard from "../components/NoticeBoard";
const quick = [
  { label:"ভর্তির আবেদন",desc:"অনলাইনে আবেদন করুন",icon:ClipboardList,href:"/admission",primary:true },
  { label:"শিক্ষার্থী লগইন",desc:"ফলাফল, হাজিরা ও পাওনা",icon:GraduationCap,href:"/login/student" },
  { label:"শিক্ষক লগইন",desc:"হাজিরা ও নম্বর",icon:UserRound,href:"/login/teacher" },
  { label:"শ্রেণি শিক্ষক",desc:"শ্রেণি ব্যবস্থাপনা",icon:UsersRound,href:"/login/class_teacher" },
  { label:"প্রতিষ্ঠান প্রধান",desc:"প্রশাসনিক ড্যাশবোর্ড",icon:UserCog,href:"/login/principal" }
];
export default function Home(){
 return <><SiteHeader/><main>
  <section style={{background:"linear-gradient(115deg,#f0f8f5 0%,#f8faf9 55%,#fff 100%)",borderBottom:"1px solid #e3e9e7"}}>
   <div className="container hero-grid grid items-center gap-12" style={{gridTemplateColumns:"1.08fr .92fr",paddingTop:66,paddingBottom:70}}>
    <div><div className="chip mb-5"><School size={13}/> একটি আধুনিক ডিজিটাল বিদ্যালয়</div>
     <h1 className="hero-title" style={{fontSize:"clamp(35px,4.3vw,57px)",lineHeight:1.27,fontWeight:800,letterSpacing:"-1.1px",marginBottom:19}}>জ্ঞান, শৃঙ্খলা ও<br/><span style={{color:"#176b61"}}>আলোকিত আগামী।</span></h1>
     <p className="muted" style={{fontSize:16,lineHeight:1.95,maxWidth:490}}>হাজী মতিউর রহমান সরকার উচ্চ বিদ্যালয়ে স্বাগতম। ভর্তি থেকে ফলাফল—শিক্ষার্থী, শিক্ষক ও অভিভাবকদের জন্য একটি সহজ ডিজিটাল প্ল্যাটফর্ম।</p>
     <div className="inline-actions mt-7"><Link className="btn primary" href="/admission">ভর্তির আবেদন করুন <ArrowRight size={17}/></Link><Link className="btn" href="#notices">নোটিশ দেখুন <FileText size={16}/></Link></div>
     <div className="flex flex-wrap items-center gap-6 mt-9 text-xs muted"><span className="flex items-center gap-2"><ShieldCheck size={16} color="#176b61"/> নিরাপদ তথ্য ব্যবস্থাপনা</span><span className="flex items-center gap-2"><BookOpenCheck size={16} color="#176b61"/> ষষ্ঠ–দশম শ্রেণি</span></div>
    </div>
    <div className="relative">
     <div style={{border:"7px solid white",borderRadius:14,boxShadow:"0 22px 55px #1a58402b",overflow:"hidden",background:"#d9e8e4"}}>
      <img alt="বিদ্যালয় ভবনের প্রতীকী চিত্র; প্রতিষ্ঠান প্রধান প্রকৃত ছবি যুক্ত করতে পারবেন" src="/school-placeholder.svg" style={{width:"100%",aspectRatio:"1.42",objectFit:"cover"}}/>
     </div>
     <div style={{position:"absolute",bottom:18,left:18,background:"white",borderRadius:7,padding:"12px 16px",boxShadow:"0 5px 20px #0002"}}>
      <div style={{fontWeight:800,fontSize:13}}>হাজী মতিউর রহমান সরকার উচ্চ বিদ্যালয়</div><div className="muted text-xs mt-1">সোনারগাঁ, নারায়ণগঞ্জ · EIIN 112359</div>
     </div>
     <div style={{position:"absolute",top:13,right:13,background:"#fffffff0",color:"#5a6b68",fontSize:10,padding:"5px 8px",borderRadius:4}}>প্রতীকী চিত্র — প্রকৃত ছবি আপলোড সাপেক্ষ</div>
    </div>
   </div>
  </section>
  <section className="container py-14" id="quick-access"><div className="flex items-end justify-between gap-4 mb-6"><div><span className="kicker">QUICK ACCESS</span><h2 className="section-title mt-2 mb-1">আপনার প্রয়োজনীয় সেবাসমূহ</h2><p className="muted text-sm">এক জায়গায় সকল গুরুত্বপূর্ণ সেবা</p></div></div>
   <div className="quick-grid grid gap-3" style={{gridTemplateColumns:"repeat(5,minmax(0,1fr))"}}>
    {quick.map(item=><Link key={item.href} href={item.href} className="panel hover:shadow-md transition-shadow p-5" style={item.primary?{background:"#176b61",color:"white",borderColor:"#176b61"}:{}}>
     <div className="mb-5 flex justify-between"><item.icon size={23} color={item.primary?"white":"#176b61"}/><ArrowRight size={15} color={item.primary?"white":"#98aaa4"}/></div>
     <div style={{fontWeight:800,fontSize:13}}>{item.label}</div><div style={{fontSize:11,marginTop:5,opacity:item.primary?.85:1}} className={item.primary?"":"muted"}>{item.desc}</div>
    </Link>)}
   </div>
  </section>
  <section className="container" id="notices"><div className="grid gap-6" style={{gridTemplateColumns:"minmax(0,1fr)"}}><NoticeBoard/></div></section>
  <section className="container mt-12"><div className="panel p-8 flex flex-wrap items-center justify-between gap-6" style={{background:"#e9f4f0"}}>
   <div><div className="kicker mb-1">ADMISSION</div><h2 style={{fontSize:21,fontWeight:800,marginBottom:4}}>নতুন শিক্ষার্থী ভর্তির আবেদন</h2><p className="muted mb-0">শিক্ষার্থীর তথ্য দিয়ে এখনই আবেদন সম্পন্ন করুন।</p></div><Link href="/admission" className="btn primary">আবেদন ফর্ম <ArrowRight size={16}/></Link>
  </div></section>
 </main><SiteFooter/></>;
}