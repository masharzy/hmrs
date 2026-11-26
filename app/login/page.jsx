import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, ShieldCheck, UserCog, UsersRound, UserRound } from "lucide-react";
import SiteHeader from "../../components/SiteHeader";
const portals=[
 {href:"/login/principal",title:"প্রধান শিক্ষক",Icon:ShieldCheck},
 {href:"/login/assistant_principal",title:"সহকারী প্রধান শিক্ষক",Icon:UserCog},
 {href:"/login/staff_manager",title:"স্টাফ ম্যানেজার",Icon:UsersRound},
 {href:"/login/class_teacher",title:"শ্রেণি শিক্ষক",Icon:UsersRound},
 {href:"/login/teacher",title:"বিষয় শিক্ষক",Icon:UserRound}
];
export default function AdminLoginPage(){return <><SiteHeader/><main className="container py-12"><div className="mx-auto max-w-3xl">
 <Link href="/" className="inline-flex items-center gap-2 text-sm muted"><ArrowLeft size={16}/> হোমে ফিরুন</Link>
 <header className="text-center my-8"><span className="inline-flex rounded-full bg-slate-100 p-3"><BookOpen size={28}/></span>
 <h1 className="section-title mt-4">প্রশাসনিক লগইন প্যানেল</h1><p className="muted">নিজ নিজ পদবি নির্বাচন করে লগইন করুন।</p></header>
 <div className="grid gap-3 sm:grid-cols-2">{portals.map(({href,title,detail,Icon})=><Link key={href} href={href} className="panel p-5 flex items-center gap-4 hover:shadow-md">
 <span className="rounded-xl bg-slate-100 p-3"><Icon size={22}/></span><span className="flex-1"><b>{title}</b></span><ArrowRight size={18}/></Link>)}</div>
 <p className="text-center muted text-sm mt-8">অভিভাবক ও শিক্ষার্থীর জন্য আলাদা লগইন বাটন হোমপেজে রয়েছে।</p>
 </div></main></>}
