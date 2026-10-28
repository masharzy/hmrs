"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Bell, BookOpen, CalendarCheck2, ClipboardCheck, CreditCard, FilePenLine, FileText, GraduationCap, LayoutDashboard, LogOut, MessageCircle, Printer, RefreshCw, School, Settings, ShieldCheck, Users, Wallet, Check, X, Plus, Send, Search, UserPlus, LockKeyhole } from "lucide-react";
import { firebaseAuth } from "../lib/firebase-client";
import { evaluateTranscript, getSubjects } from "../lib/academic";
import Marksheet from "./Marksheet";
import PinInput from "./PinInput";
import SecurityCenter from "./SecurityCenter";
import { toBanglaDigits, toAsciiDigits, gradeLabel } from "../lib/bangla-numbers";

const today = () => new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const roleNames={principal:"প্রতিষ্ঠান প্রধান",class_teacher:"শ্রেণি শিক্ষক",teacher:"শিক্ষক",student:"শিক্ষার্থী"};
const statusNames={present:"উপস্থিত",absent:"অনুপস্থিত",left_early:"পালিয়ে গেছে"};
const roles={
 student: [["overview","আমার ড্যাশবোর্ড",LayoutDashboard],["records","হাজিরা ও পাওনা",CalendarCheck2],["results","ফলাফল ও নম্বরপত্র",GraduationCap]],
 teacher: [["overview","ওভারভিউ",LayoutDashboard],["students","শিক্ষার্থী",Users],["attendance","হাজিরা",CalendarCheck2],["marks","পরীক্ষা ও নম্বর",FilePenLine]],
 class_teacher: [["overview","ওভারভিউ",LayoutDashboard],["students","শিক্ষার্থী",Users],["admissions","ভর্তি অনুমোদন",ClipboardCheck],["attendance","হাজিরা",CalendarCheck2],["marks","পরীক্ষা ও নম্বর",FilePenLine],["finance","শ্রেণির হিসাব",Wallet]],
 principal: [["overview","ওভারভিউ",LayoutDashboard],["students","শিক্ষার্থী",Users],["admissions","ভর্তি অনুমোদন",ClipboardCheck],["attendance","হাজিরা",CalendarCheck2],["marks","পরীক্ষা ও নম্বর",FilePenLine],["finance","আয়-ব্যয় হিসাব",Wallet],["notices","নোটিশ",Bell],["accounts","ইউজার ব্যবস্থাপনা",ShieldCheck],["security","লগইন নিরাপত্তা",LockKeyhole],["settings","ওয়েবসাইট সেটিংস",Settings]]
};
const Field=({label,children})=><label className="field">{label}{children}</label>;
const Input=({value,onChange,placeholder="",type="text",min,step,required=true,...rest})=><input type={type==="number"?"text":type} inputMode={type==="number"?"decimal":undefined} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} min={min} step={step} required={required} {...rest}/>;
const Select=({value,onChange,choices})=><select value={value} onChange={e=>onChange(e.target.value)}>{choices.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>;
const gradeChoices=[6,7,8,9,10].map(g=>[String(g),gradeLabel(g)]);
const secChoices=[["a","ক / A"],["b","খ / B"],["c","গ / C"]];
const sectionName=x=>({a:"ক",b:"খ",c:"গ"}[x]||x?.toUpperCase());
const phoneLink=(student,status)=>{
 const phone=toAsciiDigits(student.fatherPhone||student.motherPhone||"").replace(/[^0-9]/g,"");
 const intl=phone.startsWith("0")?"88"+phone:phone;
 const message="সম্মানিত অভিভাবক, "+student.name+" (শ্রেণি "+toBanglaDigits(student.grade)+", রোল "+toBanglaDigits(student.roll)+") আজ "+(status==="absent"?"বিদ্যালয়ে অনুপস্থিত":"অনুমতি ছাড়া বিদ্যালয় ত্যাগ করেছে")+"। অনুগ্রহ করে বিদ্যালয়ের সঙ্গে যোগাযোগ করুন। — হাজী মতিউর রহমান সরকার উচ্চ বিদ্যালয়";
 return "https://wa.me/"+intl+"?text="+encodeURIComponent(message);
};
export default function DashboardPortal() {
 const router=useRouter(),pathname=usePathname();
 const tab=pathname?.split("/")[2]||"overview";
 const [actor,setActor]=useState(null),[profile,setProfile]=useState(null);
 const [loadingSection,setLoadingSection]=useState(false);
 const [data,setData]=useState({students:[],admissions:[],attendance:[],exams:[],marks:[],ledger:[],notices:[],users:[],settings:{}});
 const [busy,setBusy]=useState(true),[working,setWorking]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [date,setDate]=useState(today()),[query,setQuery]=useState(""),[selectedStudent,setSelectedStudent]=useState(""),[examId,setExamId]=useState("");
 const [markSubject,setMarkSubject]=useState(""),[markScores,setMarkScores]=useState({});
 const [newExam,setNewExam]=useState(""),[notice,setNotice]=useState({title:"",message:"",published:true}),[login,setLogin]=useState({role:"teacher",name:"",phone:"",pin:"",assignedClasses:"6-a"});
 const [ledgerForm,setLedgerForm]=useState({type:"income",amount:"",grade:"6",section:"a",description:""});
 const [photo,setPhoto]=useState(""),[subtitle,setSubtitle]=useState(""),[uploadFile,setUploadFile]=useState(null);
 const [studentSubject,setStudentSubject]=useState({group:"science",elective:"higher-math",fourthSubject:"agriculture",optionalId:"biology"});

 async function request(resource,opts){
  const auth=firebaseAuth(),u=auth.currentUser;if(!u)throw Error("লগইন প্রয়োজন");
  const token=await u.getIdToken();
  const r=await fetch("/api/portal"+(opts?.body?"":"?resource="+encodeURIComponent(resource)+(opts?.params?"&"+opts.params:"")),{
   method:opts?.body?"POST":"GET",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
   body:opts?.body?JSON.stringify(opts.body):undefined,cache:"no-store"
  });
  const d=await r.json();if(!r.ok)throw Error(d.error||"সার্ভারে সমস্যা হয়েছে");return d;
 }
 async function refresh(who=actor,chosenDate=date,chosenExam=examId,section=tab){
  if(!who)return;
  setLoadingSection(true);
  try{
   if(who.role==="student"){
    const resource=section==="results"?"student.results":section==="records"?"student.records":"student.profile";
    setProfile(await request(resource));
    return;
   }
   const needed=new Set();
   if(["overview","students","attendance","marks","finance"].includes(section))needed.add("students");
   if(section==="marks")needed.add("exams");
   if(section==="admissions"||(section==="overview"&&who.role!=="teacher"))needed.add("admissions");
   if(section==="finance")needed.add("ledger");
   if(section==="notices")needed.add("notices");
   if(section==="accounts")needed.add("users");
   if(section==="settings")needed.add("settings");
   const entries=await Promise.all([...needed].map(async key=>[key,await request(key)]));
   const next={};entries.forEach(([key,value])=>next[key]=key==="settings"?value.settings:value.items);
   if(section==="overview"||section==="attendance"){
    const response=await request("attendance",{params:"date="+encodeURIComponent(chosenDate)});
    next.attendance=response.items;
   }
   if(section==="marks"&&chosenExam){
    const response=await request("marks",{params:"examId="+encodeURIComponent(chosenExam)});
    next.marks=response.items;
   }
   setData(old=>({...old,...next}));
   if(next.settings){setPhoto(next.settings.photoUrl||"");setSubtitle(next.settings.subtitle||"")}
  }finally{setLoadingSection(false)}
 }
 useEffect(()=>{
  let alive=true,unsubscribe=()=>{};
  try{unsubscribe=onAuthStateChanged(firebaseAuth(),async user=>{
   if(!user){router.replace("/login/student");return;}
   try{
    const p=await request("identity");
    if(!alive)return;
    setActor(p.actor);setBusy(false);
   }catch(e){if(alive){setError(e.message);setBusy(false)}}
  })}catch(e){setError(e.message);setBusy(false)}
  return ()=>{alive=false;unsubscribe()};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{
  if(!actor)return;
  if(!(roles[actor.role]||[]).some(([key])=>key===tab)){
   router.replace("/dashboard/overview");return;
  }
  refresh(actor,date,examId,tab).catch(e=>setError(e.message));
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[actor?.uid,tab]);
 async function mutate(action,params={}){
  setWorking(true);setError("");setSuccess("");
  try{const r=await request("",{body:{action,...params}});setSuccess("তথ্য সফলভাবে সংরক্ষিত হয়েছে");await refresh();
   return r;
  }catch(e){setError(e.message);return null}finally{setWorking(false)}
 }
 const students=data.students||[],exams=data.exams||[];
 const filtered=students.filter(s=>(s.name+" "+s.roll+" "+s.grade+" "+s.section+" "+toBanglaDigits(s.roll)+" "+toBanglaDigits(s.grade)).toLowerCase().includes(query.toLowerCase()));
 const chosen=students.find(s=>s.id===selectedStudent);
 const exam=exams.find(e=>e.id===examId);
 const subjects=chosen?getSubjects(chosen.grade,chosen.group,chosen.elective,chosen.fourthSubject):[];
 const subject=subjects.find(s=>s.id===markSubject);
 const resultMap=useMemo(()=>Object.fromEntries((data.marks||[]).filter(m=>m.studentId===selectedStudent).map(m=>[m.subjectId,m.scores])),[data.marks,selectedStudent]);
 const summary=useMemo(()=>({students:students.length,applications:(data.admissions||[]).filter(a=>a.status==="pending").length,present:(data.attendance||[]).filter(a=>a.status==="present").length,absent:(data.attendance||[]).filter(a=>a.status!=="present").length}),[data,students]);
 async function changeDate(v){setDate(v);try{const att=await request("attendance",{params:"date="+encodeURIComponent(v)});setData(o=>({...o,attendance:att.items}))}catch(e){setError(e.message)}}
 async function changeExam(v){setExamId(v);try{const m=v?await request("marks",{params:"examId="+encodeURIComponent(v)}):{items:[]};setData(o=>({...o,marks:m.items}))}catch(e){setError(e.message)}}
 function chooseStudent(id){
  setSelectedStudent(id);setMarkSubject("");setMarkScores({});
  const s=students.find(t=>t.id===id);
  if(s)setStudentSubject({group:s.group||"science",elective:s.elective||"higher-math",fourthSubject:s.fourthSubject||"agriculture",optionalId:s.optionalId||"biology"});
 }
 function chooseSubject(id){
  setMarkSubject(id);setMarkScores(resultMap[id]||{});
 }
 async function uploadSchoolPhoto(){
  if(!uploadFile)return;
  setWorking(true);setError("");setSuccess("");
  try{
   const formData=new FormData();formData.append("file",uploadFile);
   const token=await firebaseAuth().currentUser.getIdToken();
   const response=await fetch("/api/school-photo",{method:"POST",headers:{Authorization:"Bearer "+token},body:formData});
   const output=await response.json();
   if(!response.ok)throw Error(output.error||"ছবি আপলোড হয়নি");
   setPhoto(output.photoUrl);setUploadFile(null);setSuccess("বিদ্যালয়ের ছবি আপলোড ও প্রকাশিত হয়েছে");
   await refresh();
  }catch(e){setError(e.message)}finally{setWorking(false)}
 }
 const print=()=>window.print();
 if(busy)return <div className="dashboard-loading"><div className="dashboard-loading-ring"/><b>ড্যাশবোর্ড প্রস্তুত হচ্ছে</b><p className="muted text-xs">অ্যাকাউন্ট যাচাই করা হচ্ছে...</p></div>;
 if(!actor)return <main className="container py-16"><div className="panel p-8"><h1 className="section-title">ড্যাশবোর্ডে প্রবেশ করা যায়নি</h1><p className="alert error">{error||"অ্যাকাউন্ট পাওয়া যায়নি"}</p><Link className="btn primary mt-4" href="/login/student">পুনরায় লগইন</Link></div></main>;
 const options=(arr,place="নির্বাচন করুন")=>[[ "",place],...arr];
 return <><div style={{background:"white",borderBottom:"1px solid #e3e9e7"}}>
   <div className="container flex items-center justify-between flex-wrap gap-3 py-3">
    <Link href="/" className="flex items-center gap-2 font-extrabold"><span className="p-2 rounded" style={{background:"#176b61",color:"white"}}><School size={19}/></span>HMRS <span className="muted font-medium text-xs desktop-only">School Management</span></Link>
    <div className="inline-actions"><span className="chip">{roleNames[actor.role]}</span><span className="text-xs muted desktop-only">{actor.name||"ব্যবহারকারী"}</span><button className="btn sm" onClick={async()=>{await signOut(firebaseAuth());router.replace("/")}}><LogOut size={14}/> লগআউট</button></div>
   </div>
  </div>
  <main className="container py-7">
   <div className="dashboard-section-head"><div><span className="kicker">HMRS · {roleNames[actor.role]}</span><h1 className="section-title mt-1 mb-1">{(roles[actor.role]||[]).find(([key])=>key===tab)?.[1]||"ড্যাশবোর্ড"}</h1><p className="muted text-xs mb-0">বিদ্যালয়ের ডিজিটাল ব্যবস্থাপনা কেন্দ্র</p></div><button className="btn sm" disabled={working||loadingSection} onClick={()=>refresh().catch(e=>setError(e.message))}><RefreshCw size={14}/> রিফ্রেশ</button></div>
   {actor && !actor.pinEnabled && <div className="alert mb-4">এই অ্যাকাউন্টে এখনো মোবাইল + PIN সেট করা হয়নি। <Link href="/migrate" className="font-bold underline">একবার আপগ্রেড করুন</Link></div>}
   {error&&<div role="alert" className="alert error mb-4">{error} <button type="button" onClick={()=>setError("")} className="float-right">×</button></div>}
   {success&&<div role="status" className="alert mb-4">{success}</div>}
   <div className="dashboard-layout">
    <aside className="panel sidebar dashboard-nav" aria-label="ড্যাশবোর্ড মেনু">{(roles[actor.role]||[]).map(([key,label,Icon])=><Link key={key} href={"/dashboard/"+key} aria-current={tab===key?"page":undefined} className={tab===key?"active":""} onClick={()=>{setError("");setSuccess("")}}><Icon size={18}/><span>{label}</span></Link>)}</aside>
    <section className="min-w-0 grid gap-5 dashboard-section-content">
     {loadingSection&&<div className="dashboard-fetching"><div className="dashboard-loading-ring"/> তথ্য হালনাগাদ হচ্ছে...</div>}
     {tab==="security"&&actor.role==="principal"&&<SecurityCenter/>}
     {actor.role==="student"?<>
       {tab==="overview"&&<><div className="panel p-6"><span className="kicker">STUDENT PROFILE</span><h2 className="section-title mt-2">{profile?.student?.name}</h2><div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mt-5">{[
        ["শ্রেণি",gradeLabel(profile?.student?.grade)],["শাখা",sectionName(profile?.student?.section)],["রোল",toBanglaDigits(profile?.student?.roll)],
        ["পিতার নাম",profile?.student?.fatherName],["মাতার নাম",profile?.student?.motherName],["পূর্ববর্তী বিদ্যালয়",profile?.student?.previousSchool]
       ].map(([l,v])=><div key={l}><div className="muted text-xs mb-1">{l}</div><b>{v||"—"}</b></div>)}</div></div>
       <div className="grid grid-cols-2 gap-4"><div className="panel stat"><div className="muted text-xs">বকেয়া/পাওনা</div><strong>৳ {toBanglaDigits(profile?.dues||0)}</strong></div><div className="panel stat"><div className="muted text-xs">প্রকাশিত পরীক্ষা</div><strong>{toBanglaDigits(profile?.results?.length||0)}</strong></div></div></>}
       {tab==="records"&&<><h2 className="section-title">হাজিরা ও প্রাতিষ্ঠানিক পাওনা</h2><div className="panel stat"><div className="muted">বর্তমান বকেয়া</div><strong>৳ {toBanglaDigits(profile?.dues||0)}</strong><p className="muted text-xs mb-0">কোনো অসঙ্গতি থাকলে শ্রেণি শিক্ষকের সঙ্গে যোগাযোগ করুন।</p></div>
        <div className="panel table-wrap"><table><thead><tr><th>তারিখ</th><th>উপস্থিতি</th><th>মন্তব্য</th></tr></thead><tbody>{(profile?.attendance||[]).sort((a,b)=>b.date.localeCompare(a.date)).map(a=><tr key={a.id}><td>{toBanglaDigits(a.date)}</td><td>{statusNames[a.status]}</td><td>{a.note||"—"}</td></tr>)}</tbody></table>{!profile?.attendance?.length&&<p className="empty">হাজিরার তথ্য নেই।</p>}</div></>}
       {tab==="results"&&<><h2 className="section-title">ফলাফল ও নম্বরপত্র</h2>{!profile?.results?.length?<div className="panel empty">এখনো কোনো ফলাফল প্রকাশিত হয়নি।</div>:profile.results.map(({exam:ex,result})=><div className="panel p-6" key={ex.id}>
        <div className="flex justify-between items-center gap-3 flex-wrap"><div><b>{ex.name}</b><div className="muted text-xs mt-1">ফলাফল: {result.letter} · GPA: {toBanglaDigits(result.gpa??"অসম্পূর্ণ")}</div></div><button className="btn sm" onClick={()=>{setExamId(ex.id);print()}}><Printer size={15}/> নম্বরপত্র প্রিন্ট</button></div>
        <div className="table-wrap mt-4"><table><thead><tr><th>বিষয়</th><th>প্রাপ্ত</th><th>গ্রেড</th></tr></thead><tbody>{result.rows.map(r=><tr key={r.subjectId}><td>{r.subject.name}</td><td>{toBanglaDigits(r.status==="complete"?r.received:"—")} / {toBanglaDigits(r.subject.max)}</td><td>{r.letter||"—"}</td></tr>)}</tbody></table></div>
       </div>)}</>}
       {profile?.student&&<Marksheet student={profile.student} exam={profile.results?.find(x=>x.exam.id===examId)?.exam} report={profile.results?.find(x=>x.exam.id===examId)?.result}/>}
       {/* Student printing uses the precomputed report below; no private API bypass. */}
       {profile?.student&&profile.results?.filter(x=>x.exam.id===examId).map(({exam:ex,result})=><div key={ex.id} id="student-report-print" style={{display:"none"}}>
        <h2>হাজী মতিউর রহমান সরকার উচ্চ বিদ্যালয়</h2><p>{ex.name} — {profile.student.name} · শ্রেণি {toBanglaDigits(profile.student.grade)} · রোল {toBanglaDigits(profile.student.roll)}</p>
        <table><thead><tr><th>বিষয়</th><th>প্রাপ্ত নম্বর</th><th>গ্রেড</th></tr></thead><tbody>{result.rows.map(r=><tr key={r.subjectId}><td>{r.subject.name}</td><td>{toBanglaDigits(r.received??"—")}/{toBanglaDigits(r.subject.max)}</td><td>{r.letter??"—"}</td></tr>)}</tbody></table>
        <h3>GPA: {toBanglaDigits(result.gpa??"—")} — {result.letter}</h3>
       </div>)}
      </>:
      <>
       {tab==="overview"&&<><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[[toBanglaDigits(summary.students),"শিক্ষার্থী",Users],[toBanglaDigits(summary.applications),"অপেক্ষমাণ আবেদন",ClipboardCheck],[toBanglaDigits(summary.present),"আজ উপস্থিত",CalendarCheck2],[toBanglaDigits(summary.absent),"অনুপস্থিত/বহির্গমন",FileText]].map(([val,label,Icon])=><div className="panel stat" key={label}><div className="flex justify-between items-center muted text-xs">{label}<Icon size={17} color="#176b61"/></div><strong>{val}</strong></div>)}</div>
        <div className="panel p-6"><h2 className="font-extrabold mb-2">স্বাগতম, {actor.name}</h2><p className="muted mb-0">বাম পাশের মেনু থেকে শিক্ষার্থী তালিকা, হাজিরা ও পরীক্ষার নম্বর ব্যবস্থাপনা করুন। {actor.role==="principal"?"প্রধান শিক্ষক হিসেবে সকল প্রশাসনিক ফিচার আপনার জন্য উন্মুক্ত।":""}</p></div></>}
       {tab==="students"&&<><div className="flex items-center justify-between flex-wrap gap-3"><h2 className="section-title">শিক্ষার্থী তালিকা</h2><label className="field" style={{maxWidth:230,flex:1}}>খুঁজুন <Input value={query} onChange={setQuery} placeholder="নাম, শ্রেণি বা রোল"/></label></div><div className="panel table-wrap"><table><thead><tr><th>নাম</th><th>শ্রেণি</th><th>শাখা</th><th>রোল</th><th>পাওনা</th><th>বিস্তারিত</th></tr></thead><tbody>{filtered.map(s=><tr key={s.id}><td className="font-bold">{s.name}</td><td>{toBanglaDigits(s.grade)}</td><td>{sectionName(s.section)}</td><td>{toBanglaDigits(s.roll)}</td><td>৳ {toBanglaDigits(s.due||0)}</td><td><button className="btn sm" onClick={()=>{chooseStudent(s.id);router.push("/dashboard/marks")}}>নম্বর/বিস্তারিত</button></td></tr>)}</tbody></table>{!filtered.length&&<p className="empty">শিক্ষার্থী পাওয়া যায়নি</p>}</div></>}
       {tab==="admissions"&&<><h2 className="section-title">ভর্তি আবেদন ও অনুমোদন</h2><div className="grid gap-3">{(data.admissions||[]).map(a=><div key={a.id} className="panel p-5">
        <div className="flex flex-wrap justify-between items-start gap-2"><div><b className="text-base">{a.studentName}</b><p className="muted text-xs mt-1 mb-0">শ্রেণি {toBanglaDigits(a.grade)} · শাখা {sectionName(a.section)} · পিতা: {a.fatherName} · {toBanglaDigits(a.fatherPhone)}</p><p className="muted text-xs mt-1 mb-0">পূর্ববর্তী বিদ্যালয়: {a.previousSchool} · পেমেন্ট: {a.paymentMethod} / {a.paymentStatus}</p></div><span className={"chip "+(a.status==="pending"?"":"gray")}>{a.status}</span></div>
        {a.status==="pending"&&<AdmissionApproval item={a} busy={working} mutate={mutate} principal={actor.role==="principal"}/>}
       </div>)}{!data.admissions?.length&&<div className="panel empty">কোনো আবেদন নেই।</div>}</div></>}
       {tab==="attendance"&&<><div className="flex justify-between items-center gap-3 flex-wrap"><h2 className="section-title">দৈনিক হাজিরা</h2><label className="field">তারিখ <Input type="date" value={date} onChange={changeDate}/></label></div>
        <div className="alert">অনুপস্থিত ও পালিয়ে যাওয়া শিক্ষার্থীর ক্ষেত্রে WhatsApp বাটনে ক্লিক করলে মেসেজ খুলবে; পাঠানোর সিদ্ধান্ত শিক্ষক নিজে নেবেন।</div>
        <div className="panel table-wrap"><table><thead><tr><th>শিক্ষার্থী</th><th>শ্রেণি / রোল</th><th>অবস্থা</th><th>হাজিরা চিহ্নিত করুন</th><th>অভিভাবক</th></tr></thead><tbody>{filtered.map(s=>{
         const record=data.attendance?.find(a=>a.studentId===s.id);
         return <tr key={s.id}><td className="font-bold">{s.name}</td><td>{toBanglaDigits(s.grade)} / {toBanglaDigits(s.roll)}</td><td><span className={"chip "+(record?.status==="absent"||record?.status==="left_early"?"red":"")}>{statusNames[record?.status]||"চিহ্নিত নয়"}</span></td>
          <td><div className="inline-actions">{[["present","উপস্থিত"],["absent","অনুপস্থিত"],["left_early","পালিয়েছে"]].map(([v,l])=><button disabled={working} key={v} className={"btn sm "+(record?.status===v?"primary":"")} onClick={()=>mutate("attendance.set",{studentId:s.id,date,status:v})}>{l}</button>)}</div></td>
          <td>{record&&record.status!=="present"&&<a className="btn sm" target="_blank" rel="noopener noreferrer" href={phoneLink(s,record.status)}><MessageCircle size={15}/> WhatsApp</a>}</td>
         </tr>})}</tbody></table>{!filtered.length&&<p className="empty">শিক্ষার্থী নেই।</p>}</div></>}
       {tab==="marks"&&<><h2 className="section-title">পরীক্ষা ও নম্বর ব্যবস্থাপনা</h2>
        <div className="panel p-5"><div className="form-grid">
         <Field label="পরীক্ষা"><Select value={examId} onChange={changeExam} choices={options(exams.map(e=>[e.id,e.name+(e.published?" (প্রকাশিত)":"")]))}/></Field>
         <Field label="শিক্ষার্থী"><Select value={selectedStudent} onChange={chooseStudent} choices={options(students.map(s=>[s.id,s.name+" — "+gradeLabel(s.grade)+", রোল "+toBanglaDigits(s.roll)]))}/></Field>
        </div><div className="flex flex-wrap gap-2 items-end mt-4"><Field label="নতুন পরীক্ষার নাম"><Input value={newExam} onChange={setNewExam} placeholder="যেমন: বার্ষিক পরীক্ষা"/></Field><button disabled={working||!newExam.trim()} className="btn sm" onClick={async()=>{const r=await mutate("exam.create",{name:newExam});if(r){setNewExam("");await changeExam(r.examId)}}}><Plus size={14}/> পরীক্ষা তৈরি</button>
         {actor.role==="principal"&&exam&&<button className="btn sm" disabled={working} onClick={()=>mutate("exam.publish",{examId:exam.id,published:!exam.published})}>{exam.published?"ফলাফল অপ্রকাশ করুন":"ফলাফল প্রকাশ করুন"}</button>}</div></div>
        {chosen&&Number(chosen.grade)>=9&&<div className="panel p-5"><h3 className="font-extrabold mb-3">বিভাগ, নৈর্বাচনিক ও ৪র্থ বিষয়</h3><div className="form-grid">
         <Field label="বিভাগ"><Select value={studentSubject.group} onChange={v=>setStudentSubject(s=>({...s,group:v,elective:v==="science"?"higher-math":v==="business"?"agriculture":"civics",optionalId:v==="science"?"biology":"agriculture",fourthSubject:"agriculture"}))} choices={[["science","বিজ্ঞান"],["business","ব্যবসায় শিক্ষা"],["humanities","মানবিক"]]}/></Field>
         <Field label="নৈর্বাচনিক বিষয়"><Select value={studentSubject.elective} onChange={v=>setStudentSubject(s=>({...s,elective:v,optionalId:s.group==="business"?v:s.optionalId}))} choices={studentSubject.group==="science"?[["higher-math","উচ্চতর গণিত"],["agriculture","কৃষি শিক্ষা"],["home-science","গার্হস্থ্য বিজ্ঞান"]]:studentSubject.group==="business"?[["agriculture","কৃষি শিক্ষা"],["home-science","গার্হস্থ্য বিজ্ঞান"]]:[["civics","পৌরনীতি"],["economics","অর্থনীতি"]]}/></Field>
         {studentSubject.group==="humanities"&&<Field label="৪র্থ বিষয়"><Select value={studentSubject.fourthSubject} onChange={v=>setStudentSubject(s=>({...s,fourthSubject:v,optionalId:v}))} choices={[["agriculture","কৃষি শিক্ষা"],["home-science","গার্হস্থ্য বিজ্ঞান"]]}/></Field>}
         {studentSubject.group==="science"&&<Field label="৪র্থ বিষয়"><Select value={studentSubject.optionalId} onChange={v=>setStudentSubject(s=>({...s,optionalId:v}))} choices={[["biology","জীববিজ্ঞান"],[studentSubject.elective,studentSubject.elective==="higher-math"?"উচ্চতর গণিত":studentSubject.elective==="agriculture"?"কৃষি শিক্ষা":"গার্হস্থ্য বিজ্ঞান"]]}/></Field>}
        </div><button disabled={working} className="btn sm mt-4" onClick={()=>mutate("student.subjects",{studentId:chosen.id,...studentSubject})}>বিষয় সংরক্ষণ</button></div>}
        {chosen&&exam&&<><div className="panel p-5"><div className="flex flex-wrap justify-between gap-3 mb-4"><div><b>{chosen.name}</b><p className="muted text-xs">শ্রেণি {toBanglaDigits(chosen.grade)} · রোল {toBanglaDigits(chosen.roll)}</p></div><button className="btn sm" onClick={print}><Printer size={15}/> নম্বরপত্র প্রিন্ট</button></div>
         <Field label="বিষয় নির্বাচন"><Select value={markSubject} onChange={chooseSubject} choices={options(subjects.map(s=>[s.id,s.name+" ("+toBanglaDigits(s.max)+")"]))}/></Field>
         {subject&&<div className="mt-5">
          <div className="form-grid">{subject.parts.map(part=><Field key={part.key} label={part.label+" / "+toBanglaDigits(part.max)+(part.pass!==undefined?" (পাস "+toBanglaDigits(part.pass)+")":"")}><Input type="number" min="0" step="0.01" value={markScores[part.key]??""} onChange={v=>setMarkScores(o=>({...o,[part.key]:v===""?"":v}))}/></Field>)}</div>
          <button disabled={working||exam.published&&actor.role!=="principal"} className="btn primary mt-4" onClick={()=>mutate("marks.set",{studentId:chosen.id,examId,subjectId:markSubject,scores:markScores})}><Check size={15}/> নম্বর সংরক্ষণ</button>
         </div>}
         <div className="table-wrap mt-5"><table><thead><tr><th>বিষয়</th><th>প্রাপ্ত নম্বর</th><th>গ্রেড</th><th>অবস্থা</th></tr></thead><tbody>{evaluateTranscript(chosen,resultMap).rows.map(r=><tr key={r.subjectId}><td>{r.subject.name}{r.subjectId===chosen.optionalId?" (৪র্থ)":""}</td><td>{toBanglaDigits(r.received??"—")} / {toBanglaDigits(r.subject.max)}</td><td>{r.letter||"—"}</td><td>{r.status==="complete"?(r.passed?"পাস":"ফেল"):"অসম্পূর্ণ"}</td></tr>)}</tbody></table></div>
        </div><Marksheet student={chosen} marks={resultMap} exam={exam}/></>}
       </>}
       {tab==="finance"&&<><h2 className="section-title">{actor.role==="principal"?"বিদ্যালয়ের আয়-ব্যয়":"নিজ শ্রেণির আয়-ব্যয়"}</h2><div className="grid grid-cols-2 gap-4">{[["income","আয়"],["expense","ব্যয়"]].map(([key,label])=><div className="panel stat" key={key}><div className="muted text-xs">{label}</div><strong>৳ {(data.ledger||[]).filter(a=>a.type===key).reduce((t,a)=>t+Number(a.amount),0).toLocaleString("bn-BD")}</strong></div>)}</div>
        <div className="panel p-5"><h3 className="font-bold mb-4">নতুন হিসাব যুক্ত করুন</h3><div className="form-grid">
         <Field label="ধরন"><Select value={ledgerForm.type} onChange={v=>setLedgerForm(o=>({...o,type:v}))} choices={[["income","আয়"],["expense","ব্যয়"]]}/></Field>
         <Field label="টাকার পরিমাণ"><Input type="number" min="1" value={ledgerForm.amount} onChange={v=>setLedgerForm(o=>({...o,amount:v}))}/></Field>
         <Field label="শ্রেণি"><Select value={ledgerForm.grade} onChange={v=>setLedgerForm(o=>({...o,grade:v}))} choices={gradeChoices}/></Field>
         <Field label="শাখা"><Select value={ledgerForm.section} onChange={v=>setLedgerForm(o=>({...o,section:v}))} choices={secChoices}/></Field>
         <Field label="বিবরণ"><Input value={ledgerForm.description} onChange={v=>setLedgerForm(o=>({...o,description:v}))}/></Field>
        </div><button disabled={working} className="btn primary mt-4" onClick={async()=>{const r=await mutate("ledger.add",ledgerForm);if(r)setLedgerForm(o=>({...o,amount:"",description:""}))}}>হিসাব সংরক্ষণ</button>
        </div>
        <div className="panel p-5"><h3 className="font-bold mb-3">শিক্ষার্থীর বকেয়া হালনাগাদ</h3><DuesEditor students={students} working={working} mutate={mutate}/></div>
        <div className="panel table-wrap"><table><thead><tr><th>তারিখ</th><th>শ্রেণি</th><th>ধরন</th><th>বিবরণ</th><th>পরিমাণ</th></tr></thead><tbody>{(data.ledger||[]).map(l=><tr key={l.id}><td>{toBanglaDigits(l.createdAt?.slice(0,10))}</td><td>{toBanglaDigits(l.grade)}-{sectionName(l.section)}</td><td>{l.type==="income"?"আয়":"ব্যয়"}</td><td>{l.description}</td><td>৳ {toBanglaDigits(l.amount)}</td></tr>)}</tbody></table></div></>}
       {tab==="notices"&&<><h2 className="section-title">নোটিশ ব্যবস্থাপনা</h2><div className="panel p-5 grid gap-3">
        <Field label="নোটিশ শিরোনাম"><Input value={notice.title} onChange={v=>setNotice(o=>({...o,title:v}))}/></Field>
        <Field label="নোটিশের বিবরণ"><textarea value={notice.message} onChange={e=>setNotice(o=>({...o,message:e.target.value}))}/></Field>
        <label className="flex gap-2 items-center text-xs"><input type="checkbox" checked={notice.published} onChange={e=>setNotice(o=>({...o,published:e.target.checked}))}/> প্রকাশ করুন</label>
        <button disabled={working} className="btn primary justify-self-start" onClick={async()=>{const r=await mutate("notice.save",notice);if(r)setNotice({title:"",message:"",published:true})}}><Send size={15}/> নোটিশ সংরক্ষণ</button>
       </div><div className="grid gap-2">{(data.notices||[]).map(n=><div className="panel p-4 flex items-center justify-between gap-3" key={n.id}><div><b>{n.title}</b><div className="muted text-xs">{n.message}</div></div><button className="btn sm danger" onClick={()=>{if(confirm("নোটিশটি মুছে ফেলবেন?"))mutate("notice.delete",{id:n.id})}}><X size={14}/> মুছুন</button></div>)}</div></>}
       {tab==="accounts"&&<><h2 className="section-title">শিক্ষক অ্যাকাউন্ট তৈরি</h2><div className="panel p-5"><div className="form-grid">
        <Field label="নাম"><Input value={login.name} onChange={v=>setLogin(o=>({...o,name:v}))}/></Field>
        <Field label="মোবাইল নম্বর"><Input type="tel" value={login.phone} onChange={v=>setLogin(o=>({...o,phone:v}))} placeholder="01712345678 / +8801712345678"/></Field>
        <PinInput label="লগইন PIN" value={login.pin} onChange={v=>setLogin(o=>({...o,pin:v}))}/>
        <Field label="ভূমিকা"><Select value={login.role} onChange={v=>setLogin(o=>({...o,role:v}))} choices={[["teacher","শিক্ষক"],["class_teacher","শ্রেণি শিক্ষক"]]}/></Field>
        {login.role==="class_teacher"&&<Field label="নিজ শ্রেণি/শাখা (যেমন 6-a,7-b)"><Input value={login.assignedClasses} onChange={v=>setLogin(o=>({...o,assignedClasses:v}))}/></Field>}
       </div><p className="muted text-xs mt-4">শিক্ষকের PIN নিরাপদভাবে প্রদান করুন। PIN সরাসরি সংরক্ষিত হয় না; ভুল PIN বারবার দিলে লগইন সাময়িক বন্ধ থাকে।</p>
       <button disabled={working} className="btn primary" onClick={async()=>{const r=await mutate("account.create",{...login,assignedClasses:login.assignedClasses.split(",").map(s=>s.trim())});if(r)setLogin(o=>({...o,name:"",phone:"",pin:""}))}}><UserPlus size={15}/> অ্যাকাউন্ট তৈরি</button></div>
       <div className="panel table-wrap"><table><thead><tr><th>নাম</th><th>মোবাইল নম্বর</th><th>ভূমিকা</th><th>শ্রেণি</th></tr></thead><tbody>{data.users?.filter(u=>u.role!=="student").map(u=><tr key={u.id}><td>{u.name}</td><td>{u.phone||"পুরোনো অ্যাকাউন্ট"}</td><td>{roleNames[u.role]}</td><td>{(u.assignedClasses||[]).join(", ")}</td></tr>)}</tbody></table></div></>}
       {tab==="settings"&&<><h2 className="section-title">বিদ্যালয়ের ওয়েবসাইট সেটিংস</h2><div className="panel p-6 grid gap-4">
        <div className="alert">বিদ্যালয়ের প্রকৃত ছবি HTTPS URL হিসেবে যুক্ত করুন। অন্য বিদ্যালয়ের ছবি ব্যবহার করবেন না।</div>
        <Field label="প্রতিষ্ঠানের প্রকৃত ছবি আপলোড (JPG, PNG, WebP; সর্বোচ্চ ৩ MB)"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setUploadFile(e.target.files?.[0]||null)}/></Field>
        <button className="btn justify-self-start" disabled={working||!uploadFile} onClick={uploadSchoolPhoto}><School size={15}/> ছবি আপলোড করুন</button>
        <Field label="অথবা HTTPS ছবির URL"><Input value={photo} onChange={setPhoto} placeholder="https://example.com/actual-school.jpg"/></Field>
        <Field label="প্রতিষ্ঠানের সংক্ষিপ্ত পরিচিতি"><textarea value={subtitle} onChange={e=>setSubtitle(e.target.value)}/></Field>
        {photo&&<img src={photo} alt="বিদ্যালয়ের ছবি প্রিভিউ" className="max-w-sm w-full rounded" onError={e=>e.currentTarget.style.display="none"}/>}
        <button className="btn primary justify-self-start" disabled={working} onClick={()=>mutate("settings.update",{photoUrl:photo,subtitle})}>সেটিংস সংরক্ষণ</button>
       </div></>}
      </>}
    </section>
   </div>
  </main>
 </>;
}

function AdmissionApproval({item,mutate,busy,principal}){
 const [roll,setRoll]=useState(""),[phone,setPhone]=useState(item.studentPhone||item.fatherPhone||""),[pin,setPin]=useState("");
 return <div className="flex flex-wrap gap-3 mt-4 items-end">
  <label className="field" style={{maxWidth:90}}>রোল <input value={roll} onChange={e=>setRoll(e.target.value)} inputMode="numeric" required/></label>
  <label className="field" style={{maxWidth:230}}>লগইন মোবাইল <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+8801712345678" required/></label>
  <PinInput label="শিক্ষার্থীর PIN" value={pin} onChange={setPin}/>
  <button className="btn sm primary" disabled={busy} onClick={()=>mutate("application.approve",{id:item.id,roll,phone,pin})}><Check size={14}/> ভর্তি অনুমোদন</button>
  <button className="btn sm danger" disabled={busy} onClick={()=>{if(confirm("আবেদন বাতিল করবেন?"))mutate("application.reject",{id:item.id})}}><X size={14}/> বাতিল</button>
  {principal&&item.paymentStatus!=="verified_manually"&&<button className="btn sm" disabled={busy} onClick={()=>{if(confirm("বাস্তবে পেমেন্ট যাচাই করেছেন?"))mutate("payment.verify",{id:item.id})}}><CreditCard size={14}/> পেমেন্ট যাচাই হয়েছে</button>}
 </div>;
}
function DuesEditor({students,mutate,working}){
 const [id,setId]=useState(""),[amount,setAmount]=useState("");
 return <div className="flex flex-wrap gap-3 items-end">
  <Field label="শিক্ষার্থী"><Select value={id} onChange={v=>{setId(v);setAmount(String(students.find(s=>s.id===v)?.due||0))}} choices={[["","নির্বাচন করুন"],...students.map(s=>[s.id,s.name+" ("+s.grade+" / "+s.roll+")"])]}/></Field>
  <Field label="পাওনা (৳)"><Input type="number" min="0" value={amount} onChange={setAmount}/></Field>
  <button disabled={working||!id||amount===""} className="btn primary" onClick={()=>mutate("student.dues",{studentId:id,amount})}>সংরক্ষণ</button>
 </div>;
}
