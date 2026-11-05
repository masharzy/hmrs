"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { BookOpen, GraduationCap, LayoutDashboard, Menu, X } from "lucide-react";
import { firebaseAuth } from "../lib/firebase-client";

const items=[["হোম","/"],["ভর্তি আবেদন","/admission"],["নোটিশ","/#notices"],["রুটিন","/#routines"],["ফলাফল","/login/student"]];
export default function SiteHeader(){
 const [open,setOpen]=useState(false);
 const [signedIn,setSignedIn]=useState(null);
 useEffect(()=>{
  let unsubscribe=()=>{};
  try{
   unsubscribe=onAuthStateChanged(firebaseAuth(),user=>setSignedIn(!!user),()=>setSignedIn(false));
  }catch{setSignedIn(false)}
  return ()=>unsubscribe();
 },[]);
 const mobileItems=signedIn===true?[...items.filter(([label])=>label!=="ফলাফল"),["ড্যাশবোর্ড","/dashboard/overview"]]
  :signedIn===false?[...items,["শিক্ষার্থী লগইন","/login/student"],["শিক্ষক লগইন","/login/teacher"],["প্রধান শিক্ষক","/login/principal"]]:items;
 return <header className="site-header" style={{background:"white",borderBottom:"1px solid #e7eceb",position:"sticky",top:0,zIndex:30}}>
  <div className="container flex items-center justify-between" style={{height:72,gap:20}}>
   <Link href="/" className="flex items-center gap-3" aria-label="বিদ্যালয়ের হোম পেজ">
    <div style={{height:43,width:43,borderRadius:8,background:"#176b61",color:"white"}} className="flex items-center justify-center"><GraduationCap size={24}/></div>
    <div><div style={{fontSize:15,fontWeight:800,lineHeight:1.45}}>হাজী মতিউর রহমান সরকার</div><div style={{fontSize:11,color:"#66788b"}}>উচ্চ বিদ্যালয় <span style={{marginLeft:7,color:"#177263"}}>EIIN ১১২৩৫৯</span></div></div>
   </Link>
   <nav className="desktop-only flex items-center gap-6" aria-label="মূল নেভিগেশন">
    {items.filter(([label])=>signedIn!==true||label!=="ফলাফল").map(([label,href])=><Link key={href} className="text-sm font-semibold hover:text-primary" href={href}>{label}</Link>)}
   </nav>
   <div className="desktop-only">
    {signedIn===true?<Link href="/dashboard/overview" className="btn sm primary"><LayoutDashboard size={16}/> ড্যাশবোর্ড</Link>
     :signedIn===false?<Link href="/login/student" className="btn sm"><BookOpen size={16}/> পোর্টাল লগইন</Link>
     :<span className="site-header-auth-pending" aria-hidden="true"/>}
   </div>
   <button aria-label={open?"মেনু বন্ধ করুন":"মেনু খুলুন"} aria-expanded={open} className="md:hidden btn sm" onClick={()=>setOpen(v=>!v)}>{open?<X size={20}/>:<Menu size={20}/>}</button>
  </div>
  {open&&<nav className="container pb-4 grid gap-2" aria-label="মোবাইল নেভিগেশন">{mobileItems.map(([name,href])=><Link key={href} href={href} onClick={()=>setOpen(false)} className="p-2 rounded hover:bg-canvas">{name}</Link>)}</nav>}
 </header>;
}
