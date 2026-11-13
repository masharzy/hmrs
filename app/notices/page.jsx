import Link from "next/link";
import { ArrowLeft, Bell } from "lucide-react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import NoticeBoard from "../../components/NoticeBoard";
import "./notices.css";

export const metadata={title:"বিদ্যালয়ের নোটিশ | হাজী মতিউর রহমান সরকার উচ্চ বিদ্যালয়",description:"বিদ্যালয়ের সকল প্রকাশিত নোটিশ ও বিজ্ঞপ্তি দেখুন"};
export default function NoticesPage(){
 return <><SiteHeader/><main className="hmrs-notices-page"><div className="container">
  <div className="hmrs-notices-heading"><div><span><Bell size={18}/> বিদ্যালয়ের বিজ্ঞপ্তি</span>
   <h1>সকল নোটিশ</h1><p>সর্বশেষ বিজ্ঞপ্তি, সংযুক্ত ছবি ও PDF এক জায়গায়। নোটিশে ক্লিক করে সম্পূর্ণ বিবরণ দেখুন।</p></div>
   <Link href="/" className="btn sm"><ArrowLeft size={15}/> হোমে ফিরুন</Link></div>
  <NoticeBoard full/>
 </div></main><SiteFooter/></>;
}
