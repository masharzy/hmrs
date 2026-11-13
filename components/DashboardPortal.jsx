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
import {enNumber,enGrade,enStream,enSubject,enPart} from "../lib/result-english.js";
const formatClassEnglish=(grade,group)=>enGrade(grade)+(group?" · "+enStream(group):"");
import { formatClass, groupNames } from "../lib/student-admin";
import { allowedSubjects } from "../lib/staff-permissions.js";
import StudentResultCard from "./StudentResultCard";
import {buildClassResultMetrics} from "../lib/result-metrics.js";
import {examAppliesToStudent,examScopeGrade,examScopeLabel} from "../lib/exam-scope.js";
const ExamCreateModal=dynamic(()=>import("./ExamCreateModal"),{ssr:false});
const ResultPublishControls=dynamic(()=>import("./ResultPublishControls"),{ssr:false});

// Parameter-scoped keys keep attendance dates and exam results separate.
const routeKey=(section,date,examId)=>section==="attendance"?"attendance:"+date:section==="marks"?"marks:"+(examId||"none"):section;
const today = () => new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const roleNames={principal:"Head Teacher",class_teacher:"Class Teacher",teacher:"Teacher",student:"Student"};
const statusNames={present:"Present",absent:"Absent",left_early:"Left Early"};
const roles={
 student: [["overview","My Dashboard",LayoutDashboard],["records","Attendance & Dues",CalendarCheck2],["results","Results & Marksheet",GraduationCap],["profile","My PIN",LockKeyhole]],
 teacher: [["overview","Overview",LayoutDashboard],["students","Student",Users],["attendance","Attendance",CalendarCheck2],["marks","Exams & Marks",FilePenLine],["profile","My PIN",LockKeyhole]],
 class_teacher: [["overview","Overview",LayoutDashboard],["students","Student",Users],["admissions","Approve Admission",ClipboardCheck],["attendance","Attendance",CalendarCheck2],["marks","Exams & Marks",FilePenLine],["finance","Class Accounts",Wallet],["profile","My PIN",LockKeyhole]],
 principal: [["overview","Overview",LayoutDashboard],["students","Student",Users],["admissions","Approve Admission",ClipboardCheck],["attendance","Attendance",CalendarCheck2],["marks","Exams & Marks",FilePenLine],["finance","Finance",Wallet],["notices","Notices",Bell],["routines","Routines",CalendarCheck2],["accounts","Staff Accounts",ShieldCheck],["security","Login Security",LockKeyhole],["settings","Website Settings",Settings],["profile","My PIN",LockKeyhole]]
};
const Field=({label,children})=><label className="field">{label}{children}</label>;
const Input=({value,onChange,placeholder="",type="text",min,step,required=true,...rest})=><input type={type==="number"?"text":type} inputMode={type==="number"?"decimal":undefined} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} min={min} step={step} required={required} {...rest}/>;
const Select=({value,onChange,choices})=><select value={value} onChange={e=>onChange(e.target.value)}>{choices.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>;
const gradeChoices=[6,7,8,9,10].map(g=>[String(g),enGrade(g)]);
const phoneLink=(student,status)=>{
 const phone=toAsciiDigits(student.fatherPhone||student.motherPhone||"").replace(/[^0-9]/g,"");
 const intl=phone.startsWith("0")?"88"+phone:phone;
 const message="সম্মানিত অভিভাবক, "+student.name+" (শ্রেণি "+toAsciiDigits(student.grade)+", রোল "+toAsciiDigits(student.roll)+") আজ "+(status==="absent"?"বিদ্যালয়ে অনুপস্থিত":"অনুমতি ছাড়া বিদ্যালয় ত্যাগ করেছে")+"। অনুগ্রহ করে বিদ্যালয়ের সঙ্গে যোগাযোগ করুন। — হাজী মতিউর রহমান সরকার উচ্চ বিদ্যালয়";
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
 const [page,setPage]=useState(1),[admissionsPage,setAdmissionsPage]=useState(1);
 const [studentGrade,setStudentGrade]=useState(""),[studentGroup,setStudentGroup]=useState("");
 const [admissionGrade,setAdmissionGrade]=useState(""),[admissionGroup,setAdmissionGroup]=useState("");
 const [data,setData]=useState({students:[],admissions:[],attendance:[],exams:[],marks:[],ledger:[],notices:[],routines:[],users:[],settings:{}});
 const [busy,setBusy]=useState(true),[working,setWorking]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [date,setDate]=useState(today()),[query,setQuery]=useState(""),[selectedStudent,setSelectedStudent]=useState(""),[examId,setExamId]=useState("");
 const [markSubject,setMarkSubject]=useState(""),[markScores,setMarkScores]=useState({});
 const [markMode,setMarkMode]=useState("grid");
 const [creatingExam,setCreatingExam]=useState(false);
 const [individualGrade,setIndividualGrade]=useState(""),[individualGroup,setIndividualGroup]=useState("");
 const [ledgerForm,setLedgerForm]=useState({type:"income",amount:"",grade:"6",description:""});
 const [photo,setPhoto]=useState(""),[subtitle,setSubtitle]=useState(""),[uploadFile,setUploadFile]=useState(null);
 const photoUploadInput=useRef(null);
 const [studentSubject,setStudentSubject]=useState({group:"science",elective:"higher-math",fourthSubject:"agriculture",optionalId:"biology"});

 async function request(resource,opts){
  const auth=firebaseAuth(),u=auth.currentUser;if(!u)throw Error("Sign in required");
  const token=await u.getIdToken();
  const r=await fetch("/api/portal"+(opts?.body?"":"?resource="+encodeURIComponent(resource)+(opts?.params?"&"+opts.params:"")),{
   method:opts?.body?"POST":"GET",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
   body:opts?.body?JSON.stringify(opts.body):undefined,cache:"no-store",signal:opts?.signal
  });
  const d=await r.json();if(!r.ok)throw Error(d.error||"Server request failed");return d;
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
  // Spreadsheet auto-save is quiet: don't block navigation or flash a global banner each time.
  const quiet=action==="marks.batch";
  if(!quiet){setWorking(true);setError("");setSuccess("")}
  try{
   const r=await request("",{body:{action,...params}});
   if(!quiet)setSuccess("Changes saved successfully");
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
   if(action==="pin.change"||action==="student.pin.reset"||action.startsWith("account."))return r;
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
    :action.startsWith("exam.")||action.startsWith("result.")?["marks"]
    :[];
   for(const key of [...routeCache.current.keys()])
    if(affected.some(section=>key===section||key.startsWith(section+":"))&&key!==routeKey(tab,date,examId))
     routeCache.current.delete(key);
   await refresh(actor,date,examId,tab,true);
   return r;
  }catch(e){if(!quiet)setError(e.message);return null}finally{if(!quiet)setWorking(false)}
 }
 const students=data.students||[],exams=data.exams||[];
 const incompleteStudents=students.filter(s=>s.importIncomplete||s.loginPending||(s.missingFields||[]).length>0);
 const pendingByStudent=useMemo(()=>new Map((data.pendingApplications||[]).map(a=>[a.matchedStudentId,a])),[data.pendingApplications]);
 const activeApplication=(data.pendingApplications||[]).find(a=>a.id===activeApplicationId);
 const attendanceByStudent=useMemo(()=>new Map((data.attendance||[]).map(a=>[a.studentId,a])),[data.attendance]);
 const filtered=useMemo(()=>[...students].sort((a,b)=>Number(a.grade)-Number(b.grade)||String(a.group||"").localeCompare(String(b.group||""))||Number(a.roll)-Number(b.roll)).filter(s=>
   (tab!=="students"||(!studentGrade||Number(s.grade)===Number(studentGrade))&&(!studentGroup||s.group===studentGroup))&&
   (s.name+" "+s.roll+" "+s.grade+" "+formatClassEnglish(s.grade,s.group)+" "+toAsciiDigits(s.roll)+" "+toAsciiDigits(s.grade)).toLowerCase().includes(query.toLowerCase())
 ),[students,query,tab,studentGrade,studentGroup]);
 const visiblePage=Math.min(page,Math.max(1,Math.ceil(filtered.length/25)));
 const pageItems=filtered.slice((visiblePage-1)*25,visiblePage*25);
 const admissions=data.admissions||[];
 const filteredAdmissions=useMemo(()=>admissions.filter(a=>
  (!admissionGrade||Number(a.grade)===Number(admissionGrade))&&(!admissionGroup||a.group===admissionGroup)
 ),[admissions,admissionGrade,admissionGroup]);
 const admissionsCurrentPage=Math.min(admissionsPage,Math.max(1,Math.ceil(filteredAdmissions.length/20)));
 const exam=exams.find(e=>e.id===examId);
 const individualStudents=students.filter(s=>!!exam&&examAppliesToStudent(exam,s)&&
   !!individualGrade&&Number(s.grade)===Number(individualGrade)&&
   (Number(individualGrade)<9||!!individualGroup&&s.group===individualGroup))
   .sort((a,b)=>Number(a.roll)-Number(b.roll)||a.name.localeCompare(b.name,"bn"));
 const chosen=individualStudents.find(s=>s.id===selectedStudent);
 const subjects=chosen?allowedSubjects(actor,chosen):[];
 const subject=subjects.find(s=>s.id===markSubject);
 const resultMap=useMemo(()=>Object.fromEntries((data.marks||[]).filter(m=>m.studentId===selectedStudent).map(m=>[m.subjectId,m.scores])),[data.marks,selectedStudent]);
 const individualReport=useMemo(()=>{
  if(!chosen)return null;
  try{return evaluateTranscript(chosen,resultMap)}catch{return null}
 },[chosen,resultMap]);
 const individualMetrics=useMemo(()=>{
  if(!chosen||actor?.role!=="principal")return null;
  try{return buildClassResultMetrics(chosen,students,data.marks||[])}catch{return null}
 },[chosen,students,data.marks,actor?.role]);
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
  setSelectedStudent("");setMarkSubject("");setMarkScores({});
  const scope=examScopeGrade(exams.find(e=>e.id===v));
  setIndividualGrade(scope?String(scope):"");setIndividualGroup("");
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
   if(!response.ok)throw Error(output.error||"Image upload failed");
   setPhoto(output.photoUrl);setUploadFile(null);
   if(photoUploadInput.current)photoUploadInput.current.value="";
   setSuccess("Image uploaded to ImgBB and published on the home page.");
   await refresh(actor,date,examId,"settings",true);
  }catch(e){setError(e.message)}finally{setWorking(false)}
 }
 function printMarksheet(id){
  const sheet=document.getElementById("mark-print-"+id);
  if(!sheet){setError("Printable marksheet is not ready. Please try again.");return}
  document.querySelectorAll(".hmrs-mark-report.hmrs-print-target").forEach(el=>el.classList.remove("hmrs-print-target"));
  sheet.classList.add("hmrs-print-target");
  document.body.classList.add("hmrs-print-mark");
  const clear=()=>{document.body.classList.remove("hmrs-print-mark");sheet.classList.remove("hmrs-print-target")};
  window.addEventListener("afterprint",clear,{once:true});
  window.print();
 }
 if(busy)return <div className="hmrs-auth-loading" aria-busy="true" aria-label="Checking Account"><div className="hmrs-auth-icon"><School size={24}/></div><div className="hmrs-auth-lines"><span/><span/></div><div className="hmrs-auth-layout"><span/><span/><span/><span/></div></div>;
 if(!actor)return <main className="container py-16"><div className="panel p-8"><h1 className="section-title">Dashboard Unavailable</h1><p className="alert error">{error||"Account not found"}</p><Link className="btn primary mt-4" href="/login/student">Sign In Again</Link></div></main>;
 const options=(arr,place="Select")=>[["",place],...arr];
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
   {actor&&!actor.pinEnabled&&<div className="alert mb-4">This account does not have a phone number and PIN yet. <Link href="/migrate" className="font-bold underline">Set up account</Link></div>}
   {error&&<div role="alert" className="alert error mb-4">{error}<button type="button" onClick={()=>setError("")} className="float-right" aria-label="Dismiss Error">×</button></div>}
   {success&&<div role="status" className="alert mb-4">{success}</div>}
   <section className="hmrs-main-content dashboard-section-content">
    {showPlaceholder?<DashboardSkeleton kind={tab}/>:<>
     {tab==="security"&&actor.role==="principal"&&<SecurityCenter/>}
     {tab==="profile"&&<ChangePinForm actor={actor} mutate={mutate} working={working}/>}
     {actor.role==="student"?<>
       {tab==="overview"&&<DashboardStudentHome profile={profile}/>}
       {tab==="records"&&<><h2 className="section-title">Attendance & Outstanding Dues</h2><div className="panel stat"><div className="muted">Outstanding Balance</div><strong>BDT  {toAsciiDigits(profile?.dues||0)}</strong><p className="muted text-xs mb-0">Contact your class teacher if you notice any incorrect dues.</p></div>
        <div className="panel table-wrap"><table><thead><tr><th>Date</th><th>Presentি</th><th>Notes</th></tr></thead><tbody>{(profile?.attendance||[]).sort((a,b)=>b.date.localeCompare(a.date)).map(a=><tr key={a.id}><td>{toAsciiDigits(a.date)}</td><td>{statusNames[a.status]}</td><td>{a.note||"—"}</td></tr>)}</tbody></table>{!profile?.attendance?.length&&<p className="empty">No attendance records found.</p>}</div></>}
       {tab==="results"&&<>
        <h2 className="section-title">My Results & Marksheets</h2>
        {!profile?.results?.length?<div className="panel empty">No exam results have been published for your account yet.</div>:
         profile.results.map(({exam:ex,result,metrics,marks})=>
          <StudentResultCard key={ex.id} exam={ex} result={result} metrics={metrics} marks={marks}
           onPrint={()=>printMarksheet(ex.id)}/>)}
        {profile?.student&&(profile.results||[]).map(({exam:ex,result,metrics,marks})=>
          <Marksheet key={ex.id} printId={"mark-print-"+ex.id} student={profile.student}
           exam={ex} report={result} metrics={metrics} marks={marks}/>)}
       </>}
      </>:
      <>
        {tab==="overview"&&<DashboardOverview actor={actor} summary={summary} routes={roles[actor.role]||[]}/>}
       {tab==="students"&&<>
        {!!incompleteStudents.length&&<section className="hmrs-student-warning" role="status">
          <div className="hmrs-student-warning-head"><AlertTriangle size={18}/><div><b>{toAsciiDigits(incompleteStudents.length)} students have incomplete profiles</b>
           <p>Phone, birth registration, guardian details or PIN are missing. A warning appears beside these students.</p></div></div>
          <details><summary>View students with incomplete information</summary><div className="hmrs-student-warning-list">
           {incompleteStudents.map(s=><div key={s.id} className="hmrs-warning-student">
             <button type="button" className="btn sm" onClick={()=>setEditing({type:"student",item:s})}>
              <AlertTriangle size={13}/> {s.name} · {formatClassEnglish(toAsciiDigits(s.grade),s.group)} · Roll {toAsciiDigits(s.roll)}
             </button>
             {pendingByStudent.get(s.id)?<button type="button" className="btn sm" onClick={()=>setActiveApplicationId(pendingByStudent.get(s.id).id)}>
              Application received · Pending · View
             </button>:<span className="muted text-xs">No matching application yet</span>}
            </div>)}
          </div></details>
         </section>}
        {activeApplication&&<section className="hmrs-student-application">
          <div className="flex justify-between items-center gap-3"><h3>Pending Admission Application</h3>
           <button type="button" className="btn sm" onClick={()=>setActiveApplicationId("")}>Close</button></div>
          <p><b>Roster Name:</b> {students.find(s=>s.id===activeApplication.matchedStudentId)?.name}
           <span className="hmrs-application-status">The existing roster name will be preserved</span></p>
          <p><b>Applicant's Name:</b> {activeApplication.studentName} · Roll {toAsciiDigits(activeApplication.requestedRoll)}</p>
          <p>Father: {activeApplication.fatherName} · Mother: {activeApplication.motherName}</p>
          <p>Phone: {toAsciiDigits(activeApplication.studentPhone)} · 4th Subject: {activeApplication.optionalSubject||"Not selected yet"}</p>
          <AdmissionApproval key={activeApplication.id} item={activeApplication} mutate={async(action,params)=>{
            const result=await mutate(action,params);if(result&&action==="application.approve")setActiveApplicationId("");return result;
           }} busy={working} principal={actor.role==="principal"}/>
         </section>}
        <div className="dashboard-toolbar"><div><h2 className="section-title">Student Records</h2><p className="muted text-xs">{toAsciiDigits(filtered.length)} students</p></div>
         <div className="hmrs-student-filters">
           <label className="field">Class<select value={studentGrade} onChange={e=>{setStudentGrade(e.target.value);setStudentGroup("");setPage(1)}}>
            <option value="">All Classes</option>{gradeChoices.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
           {Number(studentGrade)>=9&&<label className="field">Group<select value={studentGroup} onChange={e=>{setStudentGroup(e.target.value);setPage(1)}}>
            <option value="">All Groups</option><option value="science">Science</option><option value="business">Business Studies</option><option value="humanities">Humanities</option></select></label>}
           <label className="field dashboard-search">Search <Input value={query} onChange={v=>{setQuery(v);setPage(1)}} placeholder="Name, class or roll"/></label>
          </div></div>
        <div className="panel table-wrap dashboard-desktop-table"><table><thead><tr><th>No.</th><th>Name</th><th>Class / Group</th><th>Roll</th><th>Dues</th><th>Actions</th></tr></thead><tbody>{pageItems.map((s,i)=><tr key={s.id}><td>{toAsciiDigits((visiblePage-1)*25+i+1)}</td>
         <td className="font-bold">{s.name}{pendingByStudent.get(s.id)&&<span className="hmrs-application-status">Application Pending</span>}{(s.importIncomplete||s.loginPending||(s.missingFields||[]).length>0)&&
           <button type="button" title={"Missing information: "+(s.missingFields||[]).join(", ")} className="hmrs-student-incomplete-icon" onClick={()=>setEditing({type:"student",item:s})}>
            <AlertTriangle size={15}/><span className="sr-only">Incomplete information · Edit</span></button>}</td>
         <td>{formatClassEnglish(toAsciiDigits(s.grade),s.group)}</td>
         <td>{toAsciiDigits(s.roll)}</td><td>BDT  {toAsciiDigits(s.due||0)}</td>
         <td><div className="inline-actions"><button className="btn sm" onClick={()=>{chooseStudent(s.id);window.history.pushState(null,"","/dashboard/marks")}}><FilePenLine size={14}/> Marks</button>
          <><button className="btn sm" onClick={()=>setEditing({type:"student",item:s})}><Pencil size={14}/> Edit</button>
           {pendingByStudent.get(s.id)&&<button className="btn sm" onClick={()=>setActiveApplicationId(pendingByStudent.get(s.id).id)}>Application</button>}
           {actor.role==="principal"&&<button className="btn sm danger" onClick={()=>setDeleting(s)}><Trash2 size={14}/> Delete</button>}</></div></td>
        </tr>)}</tbody></table>{!filtered.length&&<p className="empty">No students found</p>}</div>
        <div className="dashboard-mobile-records">{pageItems.map(s=><div className="panel dashboard-mobile-record" key={s.id}>
         <b>{s.name}</b>{pendingByStudent.get(s.id)&&<span className="hmrs-application-status">Application Pending</span>}{(s.importIncomplete||s.loginPending||(s.missingFields||[]).length>0)&&
           <button type="button" className="hmrs-student-incomplete-icon" title={(s.missingFields||[]).join(", ")}
            onClick={()=>setEditing({type:"student",item:s})}><AlertTriangle size={15}/> Incomplete Information</button>}
           <p className="muted text-xs mt-1">{formatClassEnglish(toAsciiDigits(s.grade),s.group)} · Roll {toAsciiDigits(s.roll)} · Dues BDT  {toAsciiDigits(s.due||0)}</p>
         <div className="inline-actions mt-3"><button className="btn sm" onClick={()=>{chooseStudent(s.id);window.history.pushState(null,"","/dashboard/marks")}}><FilePenLine size={14}/> Marks</button>
          <><button className="btn sm" onClick={()=>setEditing({type:"student",item:s})}><Pencil size={14}/> Edit</button>
           {actor.role==="principal"&&<button className="btn sm danger" onClick={()=>setDeleting(s)}><Trash2 size={14}/> Delete</button>}</></div>
        </div>)}{!filtered.length&&<div className="panel empty">No students found</div>}</div>
        <Pager total={filtered.length} page={visiblePage} size={25} onChange={setPage}/>
       </>}
       {tab==="admissions"&&<>
        <div className="hmrs-admission-head">
         <div><h2 className="section-title">Approve Admission</h2><p className="muted text-xs">{toAsciiDigits(filteredAdmissions.length)}টি Application</p></div>
         <div className="hmrs-admission-filters">
          <label className="field">Class<select value={admissionGrade} onChange={e=>{setAdmissionGrade(e.target.value);setAdmissionGroup("");setAdmissionsPage(1)}}>
           <option value="">All Classes</option>{gradeChoices.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
          {Number(admissionGrade)>=9&&<label className="field">Group<select value={admissionGroup} onChange={e=>{setAdmissionGroup(e.target.value);setAdmissionsPage(1)}}>
           <option value="">All Groups</option><option value="science">Science</option><option value="business">Business Studies</option><option value="humanities">Humanities</option></select></label>}
         </div></div>
        <div className="hmrs-admission-list">
         {filteredAdmissions.slice((admissionsCurrentPage-1)*20,admissionsCurrentPage*20).map((a,i)=><article key={a.id} className="hmrs-admission-card panel">
          <div className="hmrs-admission-card-head">
           <span className="hmrs-admission-number">{toAsciiDigits((admissionsCurrentPage-1)*20+i+1)}</span>
           <div className="hmrs-admission-card-info"><h3>{a.studentName}</h3>
            <div className="hmrs-admission-meta"><span>{formatClassEnglish(toAsciiDigits(a.grade),a.group)}</span><span>Father: {a.fatherName}</span><span>Phone: {toAsciiDigits(a.fatherPhone)}</span></div>
            <p>Previous School: {a.previousSchool||"—"}</p>
           </div>
           <span className={"chip "+(a.status==="pending"?"":"gray")}>{({pending:"Pending",approved:"Approved",rejected:"Rejected"})[a.status]||a.status}</span>
          </div>
          {actor.role==="principal"&&a.status!=="approved"&&<button className="btn sm hmrs-admission-edit" type="button" onClick={()=>setEditing({type:"application",item:a})}><Pencil size={14}/> Edit Application</button>}
          {a.status==="pending"&&<div className="hmrs-admission-actions"><AdmissionApproval item={a} busy={working} mutate={mutate} principal={actor.role==="principal"}/></div>}
         </article>)}
         {!filteredAdmissions.length&&<p className="panel empty">No applications match these filters.</p>}
        </div>
        <Pager total={filteredAdmissions.length} page={admissionsCurrentPage} size={20} onChange={setAdmissionsPage}/>
       </>}
       {tab==="attendance"&&<>
        <div className="dashboard-toolbar"><h2 className="section-title">Attendance Register</h2><label className="field">Date <Input type="date" value={date} onChange={changeDate}/></label></div>
        <label className="field dashboard-search">Search Students <Input value={query} onChange={v=>{setQuery(v);setPage(1)}} placeholder="Name, class or roll"/></label>
        <div className="panel table-wrap dashboard-desktop-table"><table><thead><tr><th>No.</th><th>Student</th><th>Class / Roll</th><th>Status</th><th>Attendance</th><th>Guardian</th></tr></thead><tbody>{pageItems.map((s,i)=>{
         const record=attendanceByStudent.get(s.id);
         return <tr key={s.id}><td>{toAsciiDigits((visiblePage-1)*25+i+1)}</td><td className="font-bold">{s.name}</td><td>{toAsciiDigits(s.grade)} / {toAsciiDigits(s.roll)}</td>
          <td><span className={"chip "+(record?.status==="absent"||record?.status==="left_early"?"red":"")}>{statusNames[record?.status]||"Not Marked"}</span></td>
          <td><div className="inline-actions">{[["present","Present"],["absent","Absent"],["left_early","Left Early"]].map(([v,l])=><button disabled={working||changingDate} key={v} className={"btn sm "+(record?.status===v?"primary":"")} onClick={()=>mutate("attendance.set",{studentId:s.id,date,status:v})}>{l}</button>)}</div></td>
          <td>{record&&record.status!=="present"&&<a className="btn sm" target="_blank" rel="noopener noreferrer" href={phoneLink(s,record.status)}><MessageCircle size={15}/> WhatsApp</a>}</td>
         </tr>})}</tbody></table>{!filtered.length&&<p className="empty">No students found.</p>}</div>
        <div className="dashboard-mobile-records">{pageItems.map(s=>{
          const record=attendanceByStudent.get(s.id);
          return <div key={s.id} className="panel dashboard-mobile-record">
           <div className="flex justify-between items-center gap-2"><div><b>{s.name}</b><p className="muted text-xs mt-1">{formatClassEnglish(toAsciiDigits(s.grade),s.group)} · Roll {toAsciiDigits(s.roll)}</p></div>
            <span className={"chip "+(record?.status==="absent"||record?.status==="left_early"?"red":"")}>{statusNames[record?.status]||"Not Marked"}</span></div>
           <div className="inline-actions mt-3">{[["present","Present"],["absent","Absent"],["left_early","Left Early"]].map(([v,l])=><button disabled={working||changingDate} key={v} className={"btn sm "+(record?.status===v?"primary":"")} onClick={()=>mutate("attendance.set",{studentId:s.id,date,status:v})}>{l}</button>)}
            {record&&record.status!=="present"&&<a className="btn sm" target="_blank" rel="noopener noreferrer" href={phoneLink(s,record.status)}><MessageCircle size={15}/> WhatsApp</a>}</div>
          </div>;
        })}</div>
        <Pager total={filtered.length} page={visiblePage} size={25} onChange={setPage}/>
       </>}
       {tab==="marks"&&<>
        <div className="hmrs-results-page-head">
         <div><h2>Exams & Marks</h2><p>Create exams, enter marks and publish student results.</p></div>
         {(actor.role==="principal"||actor.role==="class_teacher")&&
          <button className="btn primary" type="button" onClick={()=>setCreatingExam(true)}><Plus size={16}/> Create Exam</button>}
        </div>
        <div className="hmrs-marks-mode" role="group" aria-label="Marks দেখার পদ্ধতি">
         <button className={"btn "+(markMode==="grid"?"primary":"")} type="button" onClick={()=>setMarkMode("grid")}>Class Marks (Excel)</button>
         <button className={"btn "+(markMode==="individual"?"primary":"")} type="button" onClick={()=>setMarkMode("individual")}>Individual Result</button>
        </div>
        {actor.role==="principal"&&<ResultPublishControls exams={exams} examId={examId}
         students={students} selectedStudent={selectedStudent} mode={markMode} request={request} mutate={mutate} working={working}
           onDelete={async id=>{
            const result=await mutate("exam.delete",{examId:id,confirmed:true});
            if(result){await changeExam("");return true}
            return false;
           }}/> }
        {markMode==="grid"?<ResultEntryGrid exams={exams} examId={examId} onExamChange={changeExam}
          students={students} actor={actor} request={request} mutate={mutate} working={working}/>:
         <>
          <div className="hmrs-individual-lookup panel">
           <div className="hmrs-individual-lookup-head"><h3>Individual Student Result</h3>
            <p>Exam → Class → Group (Class 9–10) → Student</p></div>
           <div className="hmrs-individual-lookup-grid">
            <Field label="Exam"><Select value={examId} onChange={changeExam}
             choices={options(exams.map(e=>[e.id,e.name+" · "+(examScopeGrade(e)?enGrade(examScopeGrade(e)):"All Classes")]),"Select exam")}/></Field>
            <Field label="Class"><Select value={individualGrade}
             onChange={v=>{setIndividualGrade(v);setIndividualGroup("");chooseStudent("");}}
             choices={[["","Select class"],...gradeChoices.filter(([n])=>!examId||examAppliesToStudent(exam,{grade:Number(n)})).map(([n])=>[n,enGrade(n)])]}/></Field>
            {Number(individualGrade)>=9&&<Field label="Group"><Select value={individualGroup}
             onChange={v=>{setIndividualGroup(v);chooseStudent("")}}
             choices={[["","Select group"],["science","Science"],["business","Business Studies"],["humanities","Humanities"]]}/></Field>}
            <Field label="Student"><Select value={selectedStudent} onChange={chooseStudent}
             choices={options(individualStudents.map(s=>[s.id,s.name+" · Roll "+enNumber(s.roll)]),
              !individualGrade||Number(individualGrade)>=9&&!individualGroup?"Select class and group":"Select student")}/></Field>
           </div>
           {exam&&<p className="hmrs-individual-context">{examScopeGrade(exam)?enGrade(examScopeGrade(exam)):"All Classes"} · {enNumber(individualStudents.length)} students</p>}
          </div>
          {chosen&&exam&&individualReport&&<StudentResultCard isAdmin exam={exam}
           result={individualReport} marks={resultMap} metrics={individualMetrics} onPrint={()=>printMarksheet(exam.id)}/>}
         {chosen&&exam&&<>
          <div className="hmrs-individual-entry panel">
           <h3>Update Subject Marks</h3>
           <p>Edit CQ, MCQ and practical marks for this student.</p>
           <Field label="Subject"><Select value={markSubject} onChange={chooseSubject}
            choices={options(subjects.map(x=>[x.id,enSubject(x.id,x.name)+" ("+enNumber(x.max)+")"]),"Select subject")}/></Field>
           {subject&&<><div className="form-grid hmrs-individual-score-fields">
            {subject.parts.map(part=><Field key={part.key} label={enPart(part.label,part.key)+" / "+enNumber(part.max)}>
             <Input type="number" min="0" step="0.01" value={markScores[part.key]??""}
              onChange={v=>setMarkScores(o=>({...o,[part.key]:v===""?"":v}))}/></Field>)}
           </div>
           <button disabled={working||changingExam||(exam.published&&actor.role!=="principal")}
            className="btn primary mt-4" onClick={()=>mutate("marks.set",
            {studentId:chosen.id,examId,subjectId:markSubject,scores:markScores})}><Check size={15}/> Save Marks</button></>}
          </div>
          <Marksheet printId={"mark-print-"+exam.id} student={chosen} marks={resultMap} exam={exam} report={individualReport} metrics={individualMetrics}/>
         </>}
       </>}</>}
       {tab==="finance"&&<><h2 className="section-title">Financial Overview</h2><div className="grid grid-cols-2 gap-4">{[["income","Income"],["expense","Expense"]].map(([key,label])=><div className="panel stat" key={key}><div className="muted text-xs">{label}</div><strong>BDT  {(data.ledger||[]).filter(a=>a.type===key).reduce((t,a)=>t+Number(a.amount),0).toLocaleString("en-US")}</strong></div>)}</div>
        <div className="panel p-5"><h3 className="font-bold mb-4">Add Financial Entry</h3><div className="form-grid">
         <Field label="Type"><Select value={ledgerForm.type} onChange={v=>setLedgerForm(o=>({...o,type:v}))} choices={[["income","Income"],["expense","Expense"]]}/></Field>
         <Field label="Amount (BDT)"><Input type="number" min="1" value={ledgerForm.amount} onChange={v=>setLedgerForm(o=>({...o,amount:v}))}/></Field>
         <Field label="Class"><Select value={ledgerForm.grade} onChange={v=>setLedgerForm(o=>({...o,grade:v}))} choices={gradeChoices}/></Field>
         <Field label="Description"><Input value={ledgerForm.description} onChange={v=>setLedgerForm(o=>({...o,description:v}))}/></Field>
        </div><button disabled={working} className="btn primary mt-4" onClick={async()=>{const r=await mutate("ledger.add",ledgerForm);if(r)setLedgerForm(o=>({...o,amount:"",description:""}))}}>Save Entry</button>
        </div>
        <div className="panel p-5"><h3 className="font-bold mb-3">Update Student Dues</h3><DuesEditor students={students} working={working} mutate={mutate}/></div>
        <div className="panel table-wrap"><table><thead><tr><th>Date</th><th>Class</th><th>Type</th><th>Description</th><th>পরিমাণ</th></tr></thead><tbody>{(data.ledger||[]).map(l=><tr key={l.id}><td>{toAsciiDigits(l.createdAt?.slice(0,10))}</td><td>{toAsciiDigits(l.grade)}</td><td>{l.type==="income"?"Income":"Expense"}</td><td>{l.description}</td><td>BDT  {toAsciiDigits(l.amount)}</td></tr>)}</tbody></table></div></>}
       {tab==="notices"&&actor.role==="principal"&&<NoticeManager items={data.notices||[]} working={working} mutate={mutate}/>}
        {tab==="routines"&&actor.role==="principal"&&<RoutineManager items={data.routines||[]} working={working} mutate={mutate}/>}
       {tab==="accounts"&&actor.role==="principal"&&<AccountManager actor={actor} request={request} working={working} mutate={mutate} error={error}/>}
       {tab==="settings"&&<><h2 className="section-title">Home Page Settings</h2><div className="panel p-6 grid gap-4">
        <div className="alert">Upload a school photo to ImgBB and it will appear on the home page. Use only your school's own images.</div>
        <Field label="Upload Home Photo (JPG, PNG, WebP; max 3 MB)"><input ref={photoUploadInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setUploadFile(e.target.files?.[0]||null)}/></Field>
        <button className="btn justify-self-start" disabled={working||!uploadFile} onClick={uploadSchoolPhoto}><School size={15}/> Upload Photo</button>
        <Field label="Or HTTPS Photo URL"><Input value={photo} onChange={setPhoto} placeholder="https://example.com/actual-school.jpg"/></Field>
        <Field label="Short School Description"><textarea value={subtitle} onChange={e=>setSubtitle(e.target.value)}/></Field>
        {photo&&<img key={photo} src={photo} alt="School Photo Preview" className="max-w-sm w-full rounded" onError={e=>e.currentTarget.style.display="none"}/>}
        <button className="btn primary justify-self-start" disabled={working} onClick={()=>mutate("settings.update",{photoUrl:photo,subtitle})}>Save Settings</button>
       </div></>}
      </>}
    </>}
   </section>
  </DashboardShell>
  {creatingExam&&<ExamCreateModal actor={actor} working={working}
    onClose={()=>setCreatingExam(false)}
    onCreate={async values=>{
     const result=await mutate("exam.create",values);
     if(!result)return false;
     await changeExam(result.examId);
     setIndividualGrade(values.scopeGrade==="all"?"":String(values.scopeGrade));
     setIndividualGroup("");
     return true;
    }}/>}
  {editing&&(actor.role==="principal"||editing.type==="student")&&<PrincipalRecordEditor
   key={editing.type+":"+editing.item.id} type={editing.type} item={editing.item}
   working={working} error={error} onClose={()=>{setEditing(null);setError("")}}
   canResetPin={actor.role==="principal"}
   onSave={async (values,loginPin,resetPin,secondaryPin,removeSecondary)=>{
    const action=editing.type==="student"?"student.update":"application.update";
    const payload=editing.type==="student"?{studentId:editing.item.id,values}:{id:editing.item.id,values};
    if(!await mutate(action,payload))return;
    if(editing.type==="student"&&!editing.item.uid&&loginPin){
     if(!await mutate("student.activate",{studentId:editing.item.id,pin:loginPin}))return;
    }
    if(editing.type==="student"&&editing.item.uid&&resetPin){
     if(!/^[0-9]{5}$/.test(toAsciiDigits(resetPin))){setError("Main PIN must have 5 digits");return}
     if(!await mutate("student.pin.reset",{studentId:editing.item.id,pin:resetPin}))return;
    }
    if(editing.type==="student"&&editing.item.uid&&removeSecondary){
     if(!await mutate("student.secondaryPin.clear",{studentId:editing.item.id}))return;
    }else if(editing.type==="student"&&editing.item.uid&&secondaryPin){
     if(!/^[0-9]{5}$/.test(toAsciiDigits(secondaryPin))){setError("Secondary PIN must have 5 digits");return}
     if(!await mutate("student.secondaryPin.set",{studentId:editing.item.id,pin:secondaryPin}))return;
    }
    setEditing(null);
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
  <label className="field" style={{maxWidth:90}}>Roll <input value={roll} onChange={e=>setRoll(e.target.value)} inputMode="numeric" required/></label>
  <label className="field" style={{maxWidth:230}}>Login Phone <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+8801712345678" required/></label>
  <PinInput label="Student PIN" value={pin} onChange={setPin}/>
  <button className="btn sm primary" disabled={busy} onClick={()=>mutate("application.approve",{id:item.id,roll,phone,pin})}><Check size={14}/> Approve Admission</button>
  <button className="btn sm danger" disabled={busy} onClick={()=>{if(confirm("Reject this application?"))mutate("application.reject",{id:item.id})}}><X size={14}/> Rejected</button>
  {principal&&item.paymentStatus!=="verified_manually"&&<button className="btn sm" disabled={busy} onClick={()=>{if(confirm("Have you verified the payment?"))mutate("payment.verify",{id:item.id})}}><CreditCard size={14}/> Payment Verified</button>}
 </div>;
}
function DuesEditor({students,mutate,working}){
 const [id,setId]=useState(""),[amount,setAmount]=useState("");
 return <div className="flex flex-wrap gap-3 items-end">
  <Field label="Student"><Select value={id} onChange={v=>{setId(v);setAmount(String(students.find(s=>s.id===v)?.due||0))}} choices={[["","Select"],...students.map(s=>[s.id,s.name+" ("+s.grade+" / "+s.roll+")"])]}/></Field>
  <Field label="Dues (BDT )"><Input type="number" min="0" value={amount} onChange={setAmount}/></Field>
  <button disabled={working||!id||amount===""} className="btn primary" onClick={()=>mutate("student.dues",{studentId:id,amount})}>Save</button>
 </div>;
}
