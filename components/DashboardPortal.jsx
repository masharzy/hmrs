"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Bell, BookOpen, CalendarCheck2, ClipboardCheck, CreditCard, FilePenLine, FileText, GraduationCap, LayoutDashboard, LogOut, MessageCircle, Printer, RefreshCw, School, Settings, ShieldCheck, Users, Wallet, Check, X, Plus, Send, Search, UserPlus, LockKeyhole, Pencil, Trash2, Menu, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { firebaseAuth } from "../lib/firebase-client";
import { evaluateTranscript, getSubjects,FOURTH_SUBJECT_OPTIONS,fourthSubjectSelection,selectedFourthSubject } from "../lib/academic";
import dynamic from "next/dynamic";
import PinInput from "./PinInput";
const Marksheet=dynamic(()=>import("./Marksheet"),{ssr:false});
const SecurityCenter=dynamic(()=>import("./SecurityCenter"),{ssr:false});
import DashboardShell, { DashboardSkeleton } from "./DashboardShell";
import DashboardOverview from "./DashboardOverview";
import DashboardStudentHome from "./DashboardStudentHome";
const RoutineManager=dynamic(()=>import("./RoutineManager"),{ssr:false});
const NoticeManager=dynamic(()=>import("./NoticeManager"),{ssr:false});
const ChangePinForm=dynamic(()=>import("./ChangePinForm"),{ssr:false});
const ResultEntryGrid=dynamic(()=>import("./ResultEntryGrid"),{ssr:false});
const AccountManager=dynamic(()=>import("./AccountManager"),{ssr:false});

import { Pager, PrincipalRecordEditor, DeleteStudentModal } from "./PrincipalRecordEditor";
import { toBanglaDigits, toAsciiDigits, gradeLabel } from "../lib/bangla-numbers";
import { formatClass, groupNames } from "../lib/student-admin";
import { allowedSubjects } from "../lib/staff-permissions.js";
import StudentResultCard from "./StudentResultCard";
const ResultPublishControls=dynamic(()=>import("./ResultPublishControls"),{ssr:false});

// Parameter-scoped keys keep attendance dates and exam results separate.
const routeKey=(section,date,examId)=>section==="attendance"?"attendance:"+date:section==="marks"?"marks:"+(examId||"none"):section;
const today = () => new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const roleNames={principal:"প্রতিষ্ঠান প্রধান",class_teacher:"শ্রেণি শিক্ষক",teacher:"শিক্ষক",student:"শিক্ষার্থী"};
const statusNames={present:"উপস্থিত",absent:"অনুপস্থিত",left_early:"পালিয়ে গেছে"};
const roles={
 student: [["overview","আমার ড্যাশবোর্ড",LayoutDashboard],["records","হাজিরা ও পাওনা",CalendarCheck2],["results","ফলাফল ও নম্বরপত্র",GraduationCap],["profile","আমার PIN",LockKeyhole]],
 teacher: [["overview","ওভারভিউ",LayoutDashboard],["students","শিক্ষার্থী",Users],["attendance","হাজিরা",CalendarCheck2],["marks","পরীক্ষা ও নম্বর",FilePenLine],["profile","আমার PIN",LockKeyhole]],
 class_teacher: [["overview","ওভারভিউ",LayoutDashboard],["students","শিক্ষার্থী",Users],["admissions","ভর্তি অনুমোদন",ClipboardCheck],["attendance","হাজিরা",CalendarCheck2],["marks","পরীক্ষা ও নম্বর",FilePenLine],["finance","শ্রেণির হিসাব",Wallet],["profile","আমার PIN",LockKeyhole]],
 principal: [["overview","ওভারভিউ",LayoutDashboard],["students","শিক্ষার্থী",Users],["admissions","ভর্তি অনুমোদন",ClipboardCheck],["attendance","হাজিরা",CalendarCheck2],["marks","পরীক্ষা ও নম্বর",FilePenLine],["finance","আয়-ব্যয় হিসাব",Wallet],["notices","নোটিশ",Bell],["routines","রুটিন",CalendarCheck2],["accounts","ইউজার ব্যবস্থাপনা",ShieldCheck],["security","লগইন নিরাপত্তা",LockKeyhole],["settings","ওয়েবসাইট সেটিংস",Settings],["profile","আমার PIN",LockKeyhole]]
};
const Field=({label,children})=><label className="field">{label}{children}</label>;
const Input=({value,onChange,placeholder="",type="text",min,step,required=true,...rest})=><input type={type==="number"?"text":type} inputMode={type==="number"?"decimal":undefined} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} min={min} step={step} required={required} {...rest}/>;
const Select=({value,onChange,choices})=><select value={value} onChange={e=>onChange(e.target.value)}>{choices.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>;
const gradeChoices=[6,7,8,9,10].map(g=>[String(g),gradeLabel(g)]);
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
 const loadedRoutes=useRef(new Set()),routeCache=useRef(new Map()),loadSequence=useRef(0);
 const activeUid=useRef(""),activeRouteRequest=useRef(null);
 const dateSequence=useRef(0),examSequence=useRef(0);
 const [changingDate,setChangingDate]=useState(false),[changingExam,setChangingExam]=useState(false);
 const [editing,setEditing]=useState(null),[deleting,setDeleting]=useState(null);
 const [activeApplicationId,setActiveApplicationId]=useState("");
 const [previewPin,setPreviewPin]=useState(null),[printExamId,setPrintExamId]=useState("");
 const [page,setPage]=useState(1),[admissionsPage,setAdmissionsPage]=useState(1);
 const [studentGrade,setStudentGrade]=useState(""),[studentGroup,setStudentGroup]=useState("");
 const [admissionGrade,setAdmissionGrade]=useState(""),[admissionGroup,setAdmissionGroup]=useState("");
 const [data,setData]=useState({students:[],admissions:[],attendance:[],exams:[],marks:[],ledger:[],notices:[],routines:[],users:[],settings:{}});
 const [busy,setBusy]=useState(true),[working,setWorking]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [date,setDate]=useState(today()),[query,setQuery]=useState(""),[selectedStudent,setSelectedStudent]=useState(""),[examId,setExamId]=useState("");
 const [markSubject,setMarkSubject]=useState(""),[markScores,setMarkScores]=useState({});
 const [markMode,setMarkMode]=useState("grid");
 const [newExam,setNewExam]=useState("");
 const [ledgerForm,setLedgerForm]=useState({type:"income",amount:"",grade:"6",description:""});
 const [photo,setPhoto]=useState(""),[subtitle,setSubtitle]=useState(""),[uploadFile,setUploadFile]=useState(null);
 const photoUploadInput=useRef(null);
 const [studentSubject,setStudentSubject]=useState({group:"science",elective:"higher-math",fourthSubject:"agriculture",optionalId:"biology"});

 async function request(resource,opts){
  const auth=firebaseAuth(),u=auth.currentUser;if(!u)throw Error("লগইন প্রয়োজন");
  const token=await u.getIdToken();
  const r=await fetch("/api/portal"+(opts?.body?"":"?resource="+encodeURIComponent(resource)+(opts?.params?"&"+opts.params:"")),{
   method:opts?.body?"POST":"GET",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
   body:opts?.body?JSON.stringify(opts.body):undefined,cache:"no-store",signal:opts?.signal
  });
  const d=await r.json();if(!r.ok)throw Error(d.error||"সার্ভারে সমস্যা হয়েছে");return d;
 }
 async function refresh(who=actor,chosenDate=date,chosenExam=examId,section=tab,force=false){
  if(!who)return;
  const key=routeKey(section,chosenDate,chosenExam);
  if(section==="profile"||section==="security"){
   activeRouteRequest.current?.abort();
   ++loadSequence.current;routeCache.current.set(key,{data:{}});setLoadingSection(false);return;
  }
  if(!force && routeCache.current.has(key)){
   activeRouteRequest.current?.abort();
   // Invalidate any older in-flight route request before restoring cached data.
   ++loadSequence.current;
   setLoadingSection(false);
   const cached=routeCache.current.get(key);
   if(cached.profile)setProfile(cached.profile);
   if(cached.data){
    setData(old=>({...old,...cached.data}));
    if(cached.data.settings){setPhoto(cached.data.settings.photoUrl||"");setSubtitle(cached.data.settings.subtitle||"")}
   }
   return;
  }
  activeRouteRequest.current?.abort();
  const controller=new AbortController();
  activeRouteRequest.current=controller;
  const seq=++loadSequence.current;
  setLoadingSection(true);
  try{
   const r=await request("dashboard.data",{params:"section="+encodeURIComponent(section)+"&date="+encodeURIComponent(chosenDate)+"&examId="+encodeURIComponent(chosenExam),signal:controller.signal});
   if(loadSequence.current===seq){
    routeCache.current.set(key,{profile:r.profile,data:r.data});
    loadedRoutes.current.add(key);
    if(r.profile)setProfile(r.profile);
    if(r.data){
     setData(old=>({...old,...r.data}));
     if(r.data.settings){setPhoto(r.data.settings.photoUrl||"");setSubtitle(r.data.settings.subtitle||"")}
    }
   }
  }finally{if(loadSequence.current===seq)setLoadingSection(false);if(activeRouteRequest.current===controller)activeRouteRequest.current=null}
 }
 useEffect(()=>{
  let alive=true,unsubscribe=()=>{};
  try{unsubscribe=onAuthStateChanged(firebaseAuth(),async user=>{
   if(!user){activeUid.current="";activeRouteRequest.current?.abort();routeCache.current.clear();router.replace("/login/student");return;}
   if(activeUid.current&&activeUid.current!==user.uid){
    activeRouteRequest.current?.abort();routeCache.current.clear();loadedRoutes.current.clear();
    ++loadSequence.current;setActor(null);setProfile(null);setBusy(true);
    setData({students:[],admissions:[],attendance:[],exams:[],marks:[],ledger:[],notices:[],routines:[],users:[],settings:{}});
   }
   if(activeUid.current===user.uid&&routeCache.current.has(routeKey(tab,date,examId)))return;
   activeUid.current=user.uid;
   try{
    const p=await request("dashboard.data",{params:"section="+encodeURIComponent(tab)+"&date="+encodeURIComponent(date)+"&examId="+encodeURIComponent(examId)});
    if(!alive||firebaseAuth().currentUser?.uid!==user.uid)return;
    if(p.profile)setProfile(p.profile);
    if(p.data){
     setData(old=>({...old,...p.data}));
     if(p.data.settings){setPhoto(p.data.settings.photoUrl||"");setSubtitle(p.data.settings.subtitle||"")}
    }
    routeCache.current.set(routeKey(tab,date,examId),{profile:p.profile,data:p.data});
    loadedRoutes.current.add(routeKey(tab,date,examId));
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
  refresh(actor,date,examId,tab).catch(e=>{if(e?.name!=="AbortError")setError(e.message)});
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[actor?.uid,tab]);
 async function mutate(action,params={}){
  setWorking(true);setError("");setSuccess("");
  try{
   const r=await request("",{body:{action,...params}});
   setSuccess("পরিবর্তন সংরক্ষিত হয়েছে");
   if(action==="attendance.set"){
    const key=routeKey("attendance",params.date,examId);
    const current=routeCache.current.get(key);
    const record={studentId:params.studentId,date:params.date,status:params.status};
    const items=[...(current?.data?.attendance||data.attendance||[]).filter(v=>v.studentId!==params.studentId),record];
    setData(old=>({...old,attendance:items}));
    if(current)routeCache.current.set(key,{...current,data:{...current.data,attendance:items}});
    routeCache.current.delete("overview");
    return r;
   }
   if(action==="marks.set"){
    const key=routeKey("marks",date,params.examId);
    const current=routeCache.current.get(key);
    const record={studentId:params.studentId,subjectId:params.subjectId,examId:params.examId,scores:params.scores};
    const items=[...(current?.data?.marks||data.marks||[]).filter(v=>!(v.studentId===params.studentId&&v.subjectId===params.subjectId)),record];
    setData(old=>({...old,marks:items}));
    if(current)routeCache.current.set(key,{...current,data:{...current.data,marks:items}});
    return r;
   }
   if(action==="marks.batch"){
    const key=routeKey("marks",date,params.examId);
    const current=routeCache.current.get(key);
    const existing=[...(current?.data?.marks||data.marks||[])];
    for(const entry of params.entries||[]){
     const index=existing.findIndex(x=>x.studentId===entry.studentId&&x.subjectId===entry.subjectId);
     const row={studentId:entry.studentId,subjectId:entry.subjectId,examId:params.examId,scores:{...(existing[index]?.scores||{}),...entry.scores}};
     if(index>=0)existing[index]=row;else existing.push(row);
    }
    setData(old=>({...old,marks:existing}));
    if(current)routeCache.current.set(key,{...current,data:{...current.data,marks:existing}});
    return r;
   }
   if(action==="account.update"&&r.relogin){await signOut(firebaseAuth());router.replace("/login/principal");return r;}
   if(action==="pin.change"||action==="student.previewPin"||action==="student.pin.reset"||action.startsWith("account."))return r;
   if(action==="routine.save"||action==="routine.delete"||action==="notice.save"||action==="notice.delete"){
    const section=action.startsWith("routine.")?"routines":"notices";
    const current=routeCache.current.get(section);
    const previous=current?.data?.[section]||data[section]||[];
    const item=section==="routines"?r.routine:r.notice;
    const updated=action.endsWith(".delete")
     ?previous.filter(row=>row.id!==(r.id||params.id))
     :[item,...previous.filter(row=>row.id!==item.id)];
    setData(old=>({...old,[section]:updated}));
    routeCache.current.set(section,{...current,data:{...current?.data,[section]:updated}});
    return r;
   }
   const affected=action.startsWith("student.")?["students","attendance","marks","finance","overview","admissions"]
    :action.startsWith("application.")?["admissions","students","overview","attendance","marks"]
    :action.startsWith("payment.")?["admissions","finance"]
    :action.startsWith("ledger.")?["finance"]
    :action.startsWith("notice.")?["notices"]
    :action.startsWith("routine.")?["routines"]
    :action.startsWith("account.")?["accounts","students","attendance","marks","overview"]
    :action.startsWith("settings.")?["settings"]
    :action.startsWith("exam.")?["marks"]
    :[];
   for(const key of [...routeCache.current.keys()])
    if(affected.some(section=>key===section||key.startsWith(section+":"))&&key!==routeKey(tab,date,examId))
     routeCache.current.delete(key);
   await refresh(actor,date,examId,tab,true);
   return r;
  }catch(e){setError(e.message);return null}finally{setWorking(false)}
 }
 const students=data.students||[],exams=data.exams||[];
 const incompleteStudents=students.filter(s=>s.importIncomplete||s.loginPending||(s.missingFields||[]).length>0);
 const pendingByStudent=useMemo(()=>new Map((data.pendingApplications||[]).map(a=>[a.matchedStudentId,a])),[data.pendingApplications]);
 const activeApplication=(data.pendingApplications||[]).find(a=>a.id===activeApplicationId);
 async function issuePreviewPin(student){
  const result=await mutate("student.previewPin",{studentId:student.id});
  if(result)setPreviewPin({name:student.name,studentId:student.id,pin:result.pin,expiresAt:result.expiresAt});
 }
 const attendanceByStudent=useMemo(()=>new Map((data.attendance||[]).map(a=>[a.studentId,a])),[data.attendance]);
 const filtered=useMemo(()=>[...students].sort((a,b)=>Number(a.grade)-Number(b.grade)||String(a.group||"").localeCompare(String(b.group||""))||Number(a.roll)-Number(b.roll)).filter(s=>
   (tab!=="students"||(!studentGrade||Number(s.grade)===Number(studentGrade))&&(!studentGroup||s.group===studentGroup))&&
   (s.name+" "+s.roll+" "+s.grade+" "+formatClass(s.grade,s.group)+" "+toBanglaDigits(s.roll)+" "+toBanglaDigits(s.grade)).toLowerCase().includes(query.toLowerCase())
 ),[students,query,tab,studentGrade,studentGroup]);
 const visiblePage=Math.min(page,Math.max(1,Math.ceil(filtered.length/25)));
 const pageItems=filtered.slice((visiblePage-1)*25,visiblePage*25);
 const admissions=data.admissions||[];
 const filteredAdmissions=useMemo(()=>admissions.filter(a=>
  (!admissionGrade||Number(a.grade)===Number(admissionGrade))&&(!admissionGroup||a.group===admissionGroup)
 ),[admissions,admissionGrade,admissionGroup]);
 const admissionsCurrentPage=Math.min(admissionsPage,Math.max(1,Math.ceil(filteredAdmissions.length/20)));
 const chosen=students.find(s=>s.id===selectedStudent);
 const exam=exams.find(e=>e.id===examId);
 const subjects=chosen?allowedSubjects(actor,chosen):[];
 const subject=subjects.find(s=>s.id===markSubject);
 const resultMap=useMemo(()=>Object.fromEntries((data.marks||[]).filter(m=>m.studentId===selectedStudent).map(m=>[m.subjectId,m.scores])),[data.marks,selectedStudent]);
 const summary=data.overview||{students:0,applications:0,present:0,absent:0};
 async function changeDate(v){
  setDate(v);
  const seq=++dateSequence.current;
  setChangingDate(true);
  try{
   const att=await request("attendance",{params:"date="+encodeURIComponent(v)});
   if(seq!==dateSequence.current)return;
   setData(o=>({...o,attendance:att.items}));
   const key=routeKey("attendance",v,examId);
   const current=routeCache.current.get(key);
   routeCache.current.set(key,{...current,data:{...current?.data,students,attendance:att.items}});
  }catch(e){if(seq===dateSequence.current)setError(e.message)}
  finally{if(seq===dateSequence.current)setChangingDate(false)}
 }
 async function changeExam(v){
  setExamId(v);
  const seq=++examSequence.current;
  setChangingExam(true);
  setData(o=>({...o,marks:[]}));
  try{
   const m=v?await request("marks",{params:"examId="+encodeURIComponent(v)}):{items:[]};
   if(seq!==examSequence.current)return;
   setData(o=>({...o,marks:m.items}));
   const key=routeKey("marks",date,v);
   const current=routeCache.current.get(key);
   routeCache.current.set(key,{...current,data:{...current?.data,students,exams,marks:m.items}});
  }catch(e){if(seq===examSequence.current)setError(e.message)}
  finally{if(seq===examSequence.current)setChangingExam(false)}
 }
 function chooseStudent(id){
  setSelectedStudent(id);setMarkSubject("");setMarkScores({});
  const s=students.find(t=>t.id===id);
  if(s&&Number(s.grade)>=9)setStudentSubject({group:s.group, ...fourthSubjectSelection(s.group,selectedFourthSubject(s))});
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
   setPhoto(output.photoUrl);setUploadFile(null);
   if(photoUploadInput.current)photoUploadInput.current.value="";
   setSuccess("ImgBB-তে ছবি আপলোড হয়েছে এবং হোমপেজে প্রকাশিত হয়েছে");
   await refresh(actor,date,examId,"settings",true);
  }catch(e){setError(e.message)}finally{setWorking(false)}
 }
 const print=()=>window.print();
 useEffect(()=>{
  if(!printExamId)return;
  const after=()=>setPrintExamId("");
  window.addEventListener("afterprint",after);
  const raf=requestAnimationFrame(()=>requestAnimationFrame(()=>window.print()));
  return ()=>{cancelAnimationFrame(raf);window.removeEventListener("afterprint",after)};
 },[printExamId]);
 if(busy)return <div className="hmrs-auth-loading" aria-busy="true" aria-label="অ্যাকাউন্ট যাচাই চলছে"><div className="hmrs-auth-icon"><School size={24}/></div><div className="hmrs-auth-lines"><span/><span/></div><div className="hmrs-auth-layout"><span/><span/><span/><span/></div></div>;
 if(!actor)return <main className="container py-16"><div className="panel p-8"><h1 className="section-title">ড্যাশবোর্ডে প্রবেশ করা যায়নি</h1><p className="alert error">{error||"অ্যাকাউন্ট পাওয়া যায়নি"}</p><Link className="btn primary mt-4" href="/login/student">পুনরায় লগইন</Link></div></main>;
 const options=(arr,place="নির্বাচন করুন")=>[["",place],...arr];
 const showPlaceholder=tab!=="security" && tab!=="profile" && !routeCache.current.has(routeKey(tab,date,examId));
 return <>
  <DashboardShell
   actor={actor}
   roleName={roleNames[actor.role]}
   routes={roles[actor.role]||[]}
   active={tab}
   loading={loadingSection||changingDate||changingExam}
   onNavigate={()=>{setError("");setSuccess("")}}
   onRefresh={()=>refresh(actor,date,examId,tab,true).catch(e=>{if(e?.name!=="AbortError")setError(e.message)})}
   onLogout={async()=>{await signOut(firebaseAuth());router.replace("/")}}
  >
   {actor&&!actor.pinEnabled&&<div className="alert mb-4">এই অ্যাকাউন্টে এখনো মোবাইল + PIN সেট করা হয়নি। <Link href="/migrate" className="font-bold underline">একবার আপগ্রেড করুন</Link></div>}
   {error&&<div role="alert" className="alert error mb-4">{error}<button type="button" onClick={()=>setError("")} className="float-right" aria-label="ত্রুটি বন্ধ করুন">×</button></div>}
   {success&&<div role="status" className="alert mb-4">{success}</div>}
   <section className="hmrs-main-content dashboard-section-content">
    {showPlaceholder?<DashboardSkeleton kind={tab}/>:<>
     {tab==="security"&&actor.role==="principal"&&<SecurityCenter/>}
     {tab==="profile"&&<ChangePinForm actor={actor} mutate={mutate} working={working}/>}
     {actor.role==="student"?<>
       {tab==="overview"&&<DashboardStudentHome profile={profile}/>}
       {tab==="records"&&<><h2 className="section-title">হাজিরা ও প্রাতিষ্ঠানিক পাওনা</h2><div className="panel stat"><div className="muted">বর্তমান বকেয়া</div><strong>৳ {toBanglaDigits(profile?.dues||0)}</strong><p className="muted text-xs mb-0">কোনো অসঙ্গতি থাকলে শ্রেণি শিক্ষকের সঙ্গে যোগাযোগ করুন।</p></div>
        <div className="panel table-wrap"><table><thead><tr><th>তারিখ</th><th>উপস্থিতি</th><th>মন্তব্য</th></tr></thead><tbody>{(profile?.attendance||[]).sort((a,b)=>b.date.localeCompare(a.date)).map(a=><tr key={a.id}><td>{toBanglaDigits(a.date)}</td><td>{statusNames[a.status]}</td><td>{a.note||"—"}</td></tr>)}</tbody></table>{!profile?.attendance?.length&&<p className="empty">হাজিরার তথ্য নেই।</p>}</div></>}
       {tab==="results"&&<>
        <h2 className="section-title">আমার প্রকাশিত ফলাফল ও নম্বরপত্র</h2>
        {!profile?.results?.length?<div className="panel empty">এখনো আপনার কোনো ফলাফল প্রকাশিত হয়নি।</div>:
         profile.results.map(({exam:ex,result,metrics,marks})=>
          <StudentResultCard key={ex.id} exam={ex} result={result} metrics={metrics} marks={marks}
           onPrint={()=>setPrintExamId(ex.id)}/>)}
        {printExamId&&profile?.student&&profile.results?.filter(x=>x.exam.id===printExamId)
          .map(({exam:ex,result,metrics,marks})=><Marksheet key={ex.id} student={profile.student}
           exam={ex} report={result} metrics={metrics} marks={marks}/>)}
       </>}
      </>:
      <>
        {tab==="overview"&&<DashboardOverview actor={actor} summary={summary} routes={roles[actor.role]||[]}/>}
       {tab==="students"&&<>
        {previewPin&&<div className="hmrs-preview-pin" role="status">
         <b>{previewPin.name} — একবার ব্যবহারযোগ্য Test PIN:</b>
         <code>{previewPin.pin}</code>
         <span>১০ মিনিটের মধ্যে একবার লগইন করা যাবে। মূল PIN অক্ষত থাকবে।</span>
         <button type="button" className="btn sm" onClick={()=>navigator.clipboard?.writeText(previewPin.pin)}>কপি</button>
         <button type="button" className="btn sm" onClick={()=>setPreviewPin(null)}>বন্ধ</button>
        </div>}
        {!!incompleteStudents.length&&<section className="hmrs-student-warning" role="status">
          <div className="hmrs-student-warning-head"><AlertTriangle size={18}/><div><b>{toBanglaDigits(incompleteStudents.length)} জন শিক্ষার্থীর তথ্য সম্পূর্ণ হয়নি</b>
           <p>মোবাইল, জন্মনিবন্ধন, অভিভাবকের তথ্য বা লগইন PIN বাকি আছে। শিক্ষার্থীর নামের পাশে সতর্কতা আইকন দেখানো হচ্ছে।</p></div></div>
          <details><summary>কার কার তথ্য অসম্পূর্ণ — দেখুন</summary><div className="hmrs-student-warning-list">
           {incompleteStudents.map(s=><div key={s.id} className="hmrs-warning-student">
             <button type="button" className="btn sm" onClick={()=>setEditing({type:"student",item:s})}>
              <AlertTriangle size={13}/> {s.name} · {formatClass(toBanglaDigits(s.grade),s.group)} · রোল {toBanglaDigits(s.roll)}
             </button>
             {pendingByStudent.get(s.id)?<button type="button" className="btn sm" onClick={()=>setActiveApplicationId(pendingByStudent.get(s.id).id)}>
              আবেদন জমা পড়েছে · অপেক্ষমাণ · দেখুন
             </button>:<span className="muted text-xs">আবেদন জমা পড়েনি / রোল মেলেনি</span>}
            </div>)}
          </div></details>
         </section>}
        {activeApplication&&<section className="hmrs-student-application">
          <div className="flex justify-between items-center gap-3"><h3>ভর্তি আবেদন · অপেক্ষমাণ</h3>
           <button type="button" className="btn sm" onClick={()=>setActiveApplicationId("")}>বন্ধ</button></div>
          <p><b>রোস্টারের নাম:</b> {students.find(s=>s.id===activeApplication.matchedStudentId)?.name}
           <span className="hmrs-application-status">Excel-এর নাম অপরিবর্তিত থাকবে</span></p>
          <p><b>আবেদনকারীর দেওয়া নাম:</b> {activeApplication.studentName} · রোল {toBanglaDigits(activeApplication.requestedRoll)}</p>
          <p>পিতা: {activeApplication.fatherName} · মাতা: {activeApplication.motherName}</p>
          <p>মোবাইল: {toBanglaDigits(activeApplication.studentPhone)} · ৪র্থ বিষয়: {activeApplication.optionalSubject||"পরে নির্বাচন"}</p>
          <AdmissionApproval key={activeApplication.id} item={activeApplication} mutate={async(action,params)=>{
            const result=await mutate(action,params);if(result&&action==="application.approve")setActiveApplicationId("");return result;
           }} busy={working} principal={actor.role==="principal"}/>
         </section>}
        <div className="dashboard-toolbar"><div><h2 className="section-title">শিক্ষার্থীর রেকর্ড</h2><p className="muted text-xs">{toBanglaDigits(filtered.length)} জন শিক্ষার্থী</p></div>
         <div className="hmrs-student-filters">
           <label className="field">শ্রেণি<select value={studentGrade} onChange={e=>{setStudentGrade(e.target.value);setStudentGroup("");setPage(1)}}>
            <option value="">সব শ্রেণি</option>{gradeChoices.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
           {Number(studentGrade)>=9&&<label className="field">বিভাগ<select value={studentGroup} onChange={e=>{setStudentGroup(e.target.value);setPage(1)}}>
            <option value="">সব বিভাগ</option><option value="science">বিজ্ঞান</option><option value="business">ব্যবসায় শিক্ষা</option><option value="humanities">মানবিক</option></select></label>}
           <label className="field dashboard-search">খুঁজুন <Input value={query} onChange={v=>{setQuery(v);setPage(1)}} placeholder="নাম, শ্রেণি বা রোল"/></label>
          </div></div>
        <div className="panel table-wrap dashboard-desktop-table"><table><thead><tr><th>ক্রমিক</th><th>নাম</th><th>শ্রেণি / বিভাগ</th><th>রোল</th><th>পাওনা</th><th>ব্যবস্থা</th></tr></thead><tbody>{pageItems.map((s,i)=><tr key={s.id}><td>{toBanglaDigits((visiblePage-1)*25+i+1)}</td>
         <td className="font-bold">{s.name}{pendingByStudent.get(s.id)&&<span className="hmrs-application-status">আবেদন অপেক্ষমাণ</span>}{(s.importIncomplete||s.loginPending||(s.missingFields||[]).length>0)&&
           <button type="button" title={"তথ্য অসম্পূর্ণ: "+(s.missingFields||[]).join(", ")} className="hmrs-student-incomplete-icon" onClick={()=>setEditing({type:"student",item:s})}>
            <AlertTriangle size={15}/><span className="sr-only">তথ্য অসম্পূর্ণ, এডিট করুন</span></button>}</td>
         <td>{formatClass(toBanglaDigits(s.grade),s.group)}</td>
         <td>{toBanglaDigits(s.roll)}</td><td>৳ {toBanglaDigits(s.due||0)}</td>
         <td><div className="inline-actions"><button className="btn sm" onClick={()=>{chooseStudent(s.id);window.history.pushState(null,"","/dashboard/marks")}}><FilePenLine size={14}/> নম্বর</button>
          <><button className="btn sm" onClick={()=>setEditing({type:"student",item:s})}><Pencil size={14}/> এডিট</button>
           {actor.role==="principal"&&s.uid&&<button className="btn sm" onClick={()=>issuePreviewPin(s)}>Test PIN</button>}
           {pendingByStudent.get(s.id)&&<button className="btn sm" onClick={()=>setActiveApplicationId(pendingByStudent.get(s.id).id)}>আবেদন</button>}
           {actor.role==="principal"&&<button className="btn sm danger" onClick={()=>setDeleting(s)}><Trash2 size={14}/> ডিলিট</button>}</></div></td>
        </tr>)}</tbody></table>{!filtered.length&&<p className="empty">শিক্ষার্থী পাওয়া যায়নি</p>}</div>
        <div className="dashboard-mobile-records">{pageItems.map(s=><div className="panel dashboard-mobile-record" key={s.id}>
         <b>{s.name}</b>{pendingByStudent.get(s.id)&&<span className="hmrs-application-status">আবেদন অপেক্ষমাণ</span>}{(s.importIncomplete||s.loginPending||(s.missingFields||[]).length>0)&&
           <button type="button" className="hmrs-student-incomplete-icon" title={(s.missingFields||[]).join(", ")}
            onClick={()=>setEditing({type:"student",item:s})}><AlertTriangle size={15}/> তথ্য অসম্পূর্ণ</button>}
           <p className="muted text-xs mt-1">{formatClass(toBanglaDigits(s.grade),s.group)} · রোল {toBanglaDigits(s.roll)} · পাওনা ৳ {toBanglaDigits(s.due||0)}</p>
         <div className="inline-actions mt-3"><button className="btn sm" onClick={()=>{chooseStudent(s.id);window.history.pushState(null,"","/dashboard/marks")}}><FilePenLine size={14}/> নম্বর</button>
          <><button className="btn sm" onClick={()=>setEditing({type:"student",item:s})}><Pencil size={14}/> এডিট</button>
           {actor.role==="principal"&&<button className="btn sm danger" onClick={()=>setDeleting(s)}><Trash2 size={14}/> ডিলিট</button>}</></div>
        </div>)}{!filtered.length&&<div className="panel empty">শিক্ষার্থী পাওয়া যায়নি</div>}</div>
        <Pager total={filtered.length} page={visiblePage} size={25} onChange={setPage}/>
       </>}
       {tab==="admissions"&&<>
        <div className="hmrs-admission-head">
         <div><h2 className="section-title">ভর্তি অনুমোদন</h2><p className="muted text-xs">{toBanglaDigits(filteredAdmissions.length)}টি আবেদন</p></div>
         <div className="hmrs-admission-filters">
          <label className="field">শ্রেণি<select value={admissionGrade} onChange={e=>{setAdmissionGrade(e.target.value);setAdmissionGroup("");setAdmissionsPage(1)}}>
           <option value="">সব শ্রেণি</option>{gradeChoices.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
          {Number(admissionGrade)>=9&&<label className="field">বিভাগ<select value={admissionGroup} onChange={e=>{setAdmissionGroup(e.target.value);setAdmissionsPage(1)}}>
           <option value="">সব বিভাগ</option><option value="science">বিজ্ঞান</option><option value="business">ব্যবসায় শিক্ষা</option><option value="humanities">মানবিক</option></select></label>}
         </div></div>
        <div className="hmrs-admission-list">
         {filteredAdmissions.slice((admissionsCurrentPage-1)*20,admissionsCurrentPage*20).map((a,i)=><article key={a.id} className="hmrs-admission-card panel">
          <div className="hmrs-admission-card-head">
           <span className="hmrs-admission-number">{toBanglaDigits((admissionsCurrentPage-1)*20+i+1)}</span>
           <div className="hmrs-admission-card-info"><h3>{a.studentName}</h3>
            <div className="hmrs-admission-meta"><span>{formatClass(toBanglaDigits(a.grade),a.group)}</span><span>পিতা: {a.fatherName}</span><span>মোবাইল: {toBanglaDigits(a.fatherPhone)}</span></div>
            <p>পূর্ববর্তী বিদ্যালয়: {a.previousSchool||"—"}</p>
           </div>
           <span className={"chip "+(a.status==="pending"?"":"gray")}>{({pending:"অপেক্ষমাণ",approved:"অনুমোদিত",rejected:"বাতিল"})[a.status]||a.status}</span>
          </div>
          {actor.role==="principal"&&a.status!=="approved"&&<button className="btn sm hmrs-admission-edit" type="button" onClick={()=>setEditing({type:"application",item:a})}><Pencil size={14}/> আবেদন এডিট</button>}
          {a.status==="pending"&&<div className="hmrs-admission-actions"><AdmissionApproval item={a} busy={working} mutate={mutate} principal={actor.role==="principal"}/></div>}
         </article>)}
         {!filteredAdmissions.length&&<p className="panel empty">এই ফিল্টারে কোনো আবেদন পাওয়া যায়নি।</p>}
        </div>
        <Pager total={filteredAdmissions.length} page={admissionsCurrentPage} size={20} onChange={setAdmissionsPage}/>
       </>}
       {tab==="attendance"&&<>
        <div className="dashboard-toolbar"><h2 className="section-title">হাজিরার তালিকা</h2><label className="field">তারিখ <Input type="date" value={date} onChange={changeDate}/></label></div>
        <label className="field dashboard-search">শিক্ষার্থী খুঁজুন <Input value={query} onChange={v=>{setQuery(v);setPage(1)}} placeholder="নাম, শ্রেণি বা রোল"/></label>
        <div className="panel table-wrap dashboard-desktop-table"><table><thead><tr><th>ক্রমিক</th><th>শিক্ষার্থী</th><th>শ্রেণি / রোল</th><th>অবস্থা</th><th>হাজিরা</th><th>অভিভাবক</th></tr></thead><tbody>{pageItems.map((s,i)=>{
         const record=attendanceByStudent.get(s.id);
         return <tr key={s.id}><td>{toBanglaDigits((visiblePage-1)*25+i+1)}</td><td className="font-bold">{s.name}</td><td>{toBanglaDigits(s.grade)} / {toBanglaDigits(s.roll)}</td>
          <td><span className={"chip "+(record?.status==="absent"||record?.status==="left_early"?"red":"")}>{statusNames[record?.status]||"চিহ্নিত নয়"}</span></td>
          <td><div className="inline-actions">{[["present","উপস্থিত"],["absent","অনুপস্থিত"],["left_early","পালিয়েছে"]].map(([v,l])=><button disabled={working||changingDate} key={v} className={"btn sm "+(record?.status===v?"primary":"")} onClick={()=>mutate("attendance.set",{studentId:s.id,date,status:v})}>{l}</button>)}</div></td>
          <td>{record&&record.status!=="present"&&<a className="btn sm" target="_blank" rel="noopener noreferrer" href={phoneLink(s,record.status)}><MessageCircle size={15}/> WhatsApp</a>}</td>
         </tr>})}</tbody></table>{!filtered.length&&<p className="empty">শিক্ষার্থী নেই।</p>}</div>
        <div className="dashboard-mobile-records">{pageItems.map(s=>{
          const record=attendanceByStudent.get(s.id);
          return <div key={s.id} className="panel dashboard-mobile-record">
           <div className="flex justify-between items-center gap-2"><div><b>{s.name}</b><p className="muted text-xs mt-1">{formatClass(toBanglaDigits(s.grade),s.group)} · রোল {toBanglaDigits(s.roll)}</p></div>
            <span className={"chip "+(record?.status==="absent"||record?.status==="left_early"?"red":"")}>{statusNames[record?.status]||"চিহ্নিত নয়"}</span></div>
           <div className="inline-actions mt-3">{[["present","উপস্থিত"],["absent","অনুপস্থিত"],["left_early","পালিয়েছে"]].map(([v,l])=><button disabled={working||changingDate} key={v} className={"btn sm "+(record?.status===v?"primary":"")} onClick={()=>mutate("attendance.set",{studentId:s.id,date,status:v})}>{l}</button>)}
            {record&&record.status!=="present"&&<a className="btn sm" target="_blank" rel="noopener noreferrer" href={phoneLink(s,record.status)}><MessageCircle size={15}/> WhatsApp</a>}</div>
          </div>;
        })}</div>
        <Pager total={filtered.length} page={visiblePage} size={25} onChange={setPage}/>
       </>}
       {tab==="marks"&&<><div className="hmrs-marks-mode" role="group" aria-label="নম্বর দেখার পদ্ধতি">
    <button className={"btn "+(markMode==="grid"?"primary":"")} type="button" onClick={()=>setMarkMode("grid")}>শ্রেণিভিত্তিক নম্বর (Excel)</button>
    <button className={"btn "+(markMode==="individual"?"primary":"")} type="button" onClick={()=>setMarkMode("individual")}>একজন শিক্ষার্থীর ফলাফল</button>
   </div>
   {actor.role==="principal"&&<ResultPublishControls exams={exams} examId={examId}
     students={students} request={request} mutate={mutate} working={working}/>}
   {markMode==="grid"?<><ResultEntryGrid exams={exams} examId={examId} onExamChange={changeExam} students={students} actor={actor} request={request} mutate={mutate} working={working}/></>:
   <><h2 className="section-title">পরীক্ষা নির্বাচন ও নম্বর প্রদান</h2>
        <div className="panel p-5"><div className="form-grid">
         <Field label="পরীক্ষা"><Select value={examId} onChange={changeExam} choices={options(exams.map(e=>[e.id,e.name+(e.published?" (প্রকাশিত)":"")]))}/></Field>
         <Field label="শিক্ষার্থী"><Select value={selectedStudent} onChange={chooseStudent} choices={options(students.map(s=>[s.id,s.name+" — "+gradeLabel(s.grade)+(Number(s.grade)>=9?" "+(groupNames[s.group]||""):"")+", রোল "+toBanglaDigits(s.roll)]))}/></Field>
        </div><div className="flex flex-wrap gap-2 items-end mt-4"><Field label="নতুন পরীক্ষার নাম"><Input value={newExam} onChange={setNewExam} placeholder="যেমন: বার্ষিক পরীক্ষা"/></Field><button disabled={working||!newExam.trim()} className="btn sm" onClick={async()=>{const r=await mutate("exam.create",{name:newExam});if(r){setNewExam("");await changeExam(r.examId)}}}><Plus size={14}/> পরীক্ষা তৈরি</button>
         </div></div>
        {chosen&&Number(chosen.grade)>=9&&<div className="panel p-5">
         <h3 className="font-extrabold mb-3">শিক্ষার্থীর ৪র্থ বিষয়</h3>
         <p className="muted text-xs mb-3">{groupNames[chosen.group]} বিভাগ · নিচের একটি ৪র্থ বিষয়ই প্রযোজ্য। বাকি বিষয় স্বয়ংক্রিয়ভাবে নির্ধারিত হবে।</p>
         <div className="flex flex-wrap items-end gap-3">
          <Field label="৪র্থ বিষয়"><Select value={studentSubject.optionalId} onChange={v=>setStudentSubject({group:chosen.group,...fourthSubjectSelection(chosen.group,v)})}
           choices={(FOURTH_SUBJECT_OPTIONS[chosen.group]||[]).map(x=>[x.id,x.name])}/></Field>
          <button disabled={working} className="btn sm" onClick={()=>mutate("student.subjects",{studentId:chosen.id,group:chosen.group,optionalId:studentSubject.optionalId})}>৪র্থ বিষয় সংরক্ষণ</button>
         </div>
        </div>}
        {chosen&&exam&&<><div className="panel p-5"><div className="flex flex-wrap justify-between gap-3 mb-4"><div><b>{chosen.name}</b><p className="muted text-xs">শ্রেণি {toBanglaDigits(chosen.grade)} · রোল {toBanglaDigits(chosen.roll)}</p></div><button className="btn sm" onClick={print}><Printer size={15}/> নম্বরপত্র প্রিন্ট</button></div>
         <Field label="বিষয় নির্বাচন"><Select value={markSubject} onChange={chooseSubject} choices={options(subjects.map(s=>[s.id,s.name+" ("+toBanglaDigits(s.max)+")"]))}/></Field>
         {subject&&<div className="mt-5">
          <div className="form-grid">{subject.parts.map(part=><Field key={part.key} label={part.label+" / "+toBanglaDigits(part.max)+(part.pass!==undefined?" (পাস "+toBanglaDigits(part.pass)+")":"")}><Input type="number" min="0" step="0.01" value={markScores[part.key]??""} onChange={v=>setMarkScores(o=>({...o,[part.key]:v===""?"":v}))}/></Field>)}</div>
          <button disabled={working||changingExam||(exam.published&&actor.role!=="principal")} className="btn primary mt-4" onClick={()=>mutate("marks.set",{studentId:chosen.id,examId,subjectId:markSubject,scores:markScores})}><Check size={15}/> নম্বর সংরক্ষণ</button>
         </div>}
         <div className="table-wrap mt-5"><table><thead><tr><th>বিষয়</th><th>প্রাপ্ত নম্বর</th><th>গ্রেড</th><th>অবস্থা</th></tr></thead><tbody>{evaluateTranscript(chosen,resultMap).rows.map(r=><tr key={r.subjectId}><td>{r.subject.name}{r.subjectId===chosen.optionalId?" (৪র্থ)":""}</td><td>{toBanglaDigits(r.received??"—")} / {toBanglaDigits(r.subject.max)}</td><td>{r.letter||"—"}</td><td>{r.status==="complete"?(r.passed?"পাস":"ফেল"):"অসম্পূর্ণ"}</td></tr>)}</tbody></table></div>
        </div><Marksheet student={chosen} marks={resultMap} exam={exam}/></>}
       </>}</>}
       {tab==="finance"&&<><h2 className="section-title">আর্থিক সারসংক্ষেপ</h2><div className="grid grid-cols-2 gap-4">{[["income","আয়"],["expense","ব্যয়"]].map(([key,label])=><div className="panel stat" key={key}><div className="muted text-xs">{label}</div><strong>৳ {(data.ledger||[]).filter(a=>a.type===key).reduce((t,a)=>t+Number(a.amount),0).toLocaleString("bn-BD")}</strong></div>)}</div>
        <div className="panel p-5"><h3 className="font-bold mb-4">নতুন হিসাব যুক্ত করুন</h3><div className="form-grid">
         <Field label="ধরন"><Select value={ledgerForm.type} onChange={v=>setLedgerForm(o=>({...o,type:v}))} choices={[["income","আয়"],["expense","ব্যয়"]]}/></Field>
         <Field label="টাকার পরিমাণ"><Input type="number" min="1" value={ledgerForm.amount} onChange={v=>setLedgerForm(o=>({...o,amount:v}))}/></Field>
         <Field label="শ্রেণি"><Select value={ledgerForm.grade} onChange={v=>setLedgerForm(o=>({...o,grade:v}))} choices={gradeChoices}/></Field>
         <Field label="বিবরণ"><Input value={ledgerForm.description} onChange={v=>setLedgerForm(o=>({...o,description:v}))}/></Field>
        </div><button disabled={working} className="btn primary mt-4" onClick={async()=>{const r=await mutate("ledger.add",ledgerForm);if(r)setLedgerForm(o=>({...o,amount:"",description:""}))}}>হিসাব সংরক্ষণ</button>
        </div>
        <div className="panel p-5"><h3 className="font-bold mb-3">শিক্ষার্থীর বকেয়া হালনাগাদ</h3><DuesEditor students={students} working={working} mutate={mutate}/></div>
        <div className="panel table-wrap"><table><thead><tr><th>তারিখ</th><th>শ্রেণি</th><th>ধরন</th><th>বিবরণ</th><th>পরিমাণ</th></tr></thead><tbody>{(data.ledger||[]).map(l=><tr key={l.id}><td>{toBanglaDigits(l.createdAt?.slice(0,10))}</td><td>{toBanglaDigits(l.grade)}</td><td>{l.type==="income"?"আয়":"ব্যয়"}</td><td>{l.description}</td><td>৳ {toBanglaDigits(l.amount)}</td></tr>)}</tbody></table></div></>}
       {tab==="notices"&&actor.role==="principal"&&<NoticeManager items={data.notices||[]} working={working} mutate={mutate}/>}
        {tab==="routines"&&actor.role==="principal"&&<RoutineManager items={data.routines||[]} working={working} mutate={mutate}/>}
       {tab==="accounts"&&actor.role==="principal"&&<AccountManager actor={actor} request={request} working={working} mutate={mutate} error={error}/>}
       {tab==="settings"&&<><h2 className="section-title">হোমপেজের তথ্য ও ছবি</h2><div className="panel p-6 grid gap-4">
        <div className="alert">ছবি আপলোড করলে ImgBB-তে সংরক্ষিত হবে এবং হোমপেজের হিরো সেকশনে স্বয়ংক্রিয়ভাবে দেখাবে। আলাদা করে সেটিংস সংরক্ষণ করতে হবে না। অন্য বিদ্যালয়ের ছবি ব্যবহার করবেন না।</div>
        <Field label="হোমপেজের ছবি আপলোড (JPG, PNG, WebP; সর্বোচ্চ ৩ MB)"><input ref={photoUploadInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setUploadFile(e.target.files?.[0]||null)}/></Field>
        <button className="btn justify-self-start" disabled={working||!uploadFile} onClick={uploadSchoolPhoto}><School size={15}/> ছবি আপলোড করুন</button>
        <Field label="অথবা HTTPS ছবির URL"><Input value={photo} onChange={setPhoto} placeholder="https://example.com/actual-school.jpg"/></Field>
        <Field label="প্রতিষ্ঠানের সংক্ষিপ্ত পরিচিতি"><textarea value={subtitle} onChange={e=>setSubtitle(e.target.value)}/></Field>
        {photo&&<img key={photo} src={photo} alt="বিদ্যালয়ের ছবি প্রিভিউ" className="max-w-sm w-full rounded" onError={e=>e.currentTarget.style.display="none"}/>}
        <button className="btn primary justify-self-start" disabled={working} onClick={()=>mutate("settings.update",{photoUrl:photo,subtitle})}>সেটিংস সংরক্ষণ</button>
       </div></>}
      </>}
    </>}
   </section>
  </DashboardShell>
  {editing&&(actor.role==="principal"||editing.type==="student")&&<PrincipalRecordEditor key={editing.type+":"+editing.item.id} type={editing.type} item={editing.item} working={working} error={error} onClose={()=>{setEditing(null);setError("")}} canResetPin={actor.role==="principal"} onSave={async (values,loginPin,resetPin)=>{
   const action=editing.type==="student"?"student.update":"application.update";
   const payload=editing.type==="student"?{studentId:editing.item.id,values}:{id:editing.item.id,values};
   if(await mutate(action,payload)){
     if(editing.type==="student"&&!editing.item.uid&&loginPin){
      if(await mutate("student.activate",{studentId:editing.item.id,pin:loginPin}))setEditing(null);
     }else if(editing.type==="student"&&editing.item.uid&&resetPin){
      if(!/^[0-9]{5}$/.test(resetPin)){setError("নতুন PIN পাঁচ সংখ্যার হতে হবে");return}
      if(await mutate("student.pin.reset",{studentId:editing.item.id,pin:resetPin}))setEditing(null);
     }else setEditing(null);
    }
  }}/>}
  {actor.role==="principal"&&deleting&&<DeleteStudentModal key={deleting.id} student={deleting} working={working} error={error} onClose={()=>{setDeleting(null);setError("")}} onDelete={async()=>{
   if(await mutate("student.delete",{studentId:deleting.id,confirmed:true})){
    if(selectedStudent===deleting.id)chooseStudent("");
    setDeleting(null);
   }
  }}/>}
 </>;
}

function AdmissionApproval({item,mutate,busy,principal}){
 const [roll,setRoll]=useState(String(item.requestedRoll||"")),[phone,setPhone]=useState(item.studentPhone||item.fatherPhone||""),[pin,setPin]=useState("");
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
