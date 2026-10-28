import Link from "next/link";
import { MapPin, ShieldCheck } from "lucide-react";
export default function SiteFooter(){
 return <footer style={{background:"white",borderTop:"1px solid #e3e9e7",marginTop:65}}>
 <div className="container flex flex-wrap items-center justify-between gap-5 py-9">
  <div><b>হাজী মতিউর রহমান সরকার উচ্চ বিদ্যালয়</b><div className="muted text-xs mt-2 flex items-center gap-2"><MapPin size={14}/> পঞ্চবটি, বৈদ্যেরবাজার, সোনারগাঁ, নারায়ণগঞ্জ</div></div>
  <div className="text-xs muted flex flex-wrap gap-5"><Link href="/admission">অনলাইন ভর্তি</Link><Link href="/login/student">শিক্ষার্থী পোর্টাল</Link><span className="flex items-center gap-1"><ShieldCheck size={14}/> সুরক্ষিত তথ্যব্যবস্থা</span></div>
 </div><div className="border-t border-line text-center py-4 text-xs muted">© {new Date().getFullYear()} HMRS High School · শিক্ষা, শৃঙ্খলা ও অগ্রগতি</div>
 </footer>
}