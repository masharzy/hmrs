"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, Landmark, Smartphone, GraduationCap } from "lucide-react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
const empty={studentName:"",dob:"",gender:"male",grade:"6",section:"a",group:"science",fatherName:"",fatherPhone:"",motherName:"",motherPhone:"",studentPhone:"",guardianAddress:"",birthRegistration:"",previousSchool:"",previousClass:"",previousResult:"",paymentMethod:"later",paymentReference:"",website:""};
const stages=["শিক্ষার্থীর তথ্য","অভিভাবকের তথ্য","পূর্ববর্তী বিদ্যালয় ও পেমেন্ট"];
function F({label,name,value,onChange,type="text",options,required=true,placeholder=""}){
 return <label className="field">{label}{options?<select name={name} value={value} onChange={onChange}>{options.map(([v,t])=><option value={v} key={v}>{t}</option>)}</select>:<input name={name} value={value} onChange={onChange} type={type} required={required} placeholder={placeholder}/>}</label>;
}
export default function Admission(){
 const [data,setData]=useState(empty),[step,setStep]=useState(0),[saving,setSaving]=useState(false),[error,setError]=useState(""),[id,setId]=useState("");
 const change=e=>setData(old=>({...old,[e.target.name]:e.target.value}));
 const proceed=e=>{e.preventDefault();setError("");setStep(v=>Math.min(2,v+1));scrollTo({top:0,behavior:"smooth"});};
 async function submit(e){e.preventDefault();setSaving(true);setError("");try{const res=await fetch("/api/admissions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const result=await res.json();if(!res.ok)throw Error(result.error||"আবেদন জমা হয়নি");setId(result.applicationId);}catch(e){setError(e.message)}finally{setSaving(false)}}
 return <><SiteHeader/><main className="container" style={{maxWidth:820}}>
  <div className="page-head"><Link href="/" className="muted flex items-center gap-1 text-xs mb-5"><ArrowLeft size={13}/> হোম পেজ</Link><span className="kicker">ONLINE ADMISSION</span><h1 className="section-title mt-2 mb-1">অনলাইন ভর্তি আবেদন</h1><p className="muted">সঠিক তথ্য দিয়ে আবেদন করুন। আবেদনের পর বিদ্যালয় কর্তৃপক্ষ যাচাই করে অনুমোদন দেবেন।</p></div>
  {id?<div className="panel p-10 text-center"><CheckCircle2 size={52} color="#176b61" className="mx-auto mb-5"/><h2 className="section-title">আবেদন জমা হয়েছে</h2><p>আপনার আবেদন নম্বর</p><div className="p-3 my-5 bg-canvas font-bold break-all">{id}</div><p className="muted">এটি সংরক্ষণ করুন। অনুমোদনের পর বিদ্যালয় থেকে আপনার শ্রেণি, শাখা, রোল ও পাসওয়ার্ড জানানো হবে।</p><Link href="/" className="btn primary mt-3">হোম পেজে ফিরুন</Link></div>:
  <div className="panel p-6 sm:p-9"><div className="flex gap-2 mb-8">{stages.map((s,i)=><div key={s} style={{flex:1}}><div style={{height:4,background:step>=i?"#176b61":"#e6ecea",borderRadius:5}}/><div style={{fontSize:10,marginTop:10,fontWeight:step===i?800:500,color:step===i?"#176b61":"#788797"}}>{i+1}. {s}</div></div>)}</div>
  <form onSubmit={step===2?submit:proceed}><h2 style={{fontSize:18,fontWeight:800,marginBottom:20}}>{stages[step]}</h2>
   {step===0&&<div className="form-grid">
    <F label="শিক্ষার্থীর পূর্ণ নাম *" name="studentName" value={data.studentName} onChange={change}/>
    <F label="জন্ম তারিখ *" name="dob" type="date" value={data.dob} onChange={change}/>
    <F label="জন্মনিবন্ধন নম্বর *" name="birthRegistration" value={data.birthRegistration} onChange={change}/>
    <F label="লিঙ্গ *" name="gender" value={data.gender} onChange={change} options={[["male","ছাত্র"],["female","ছাত্রী"],["other","অন্যান্য"]]}/>
    <F label="ভর্তিচ্ছু শ্রেণি *" name="grade" value={data.grade} onChange={change} options={[6,7,8,9,10].map(v=>[String(v),String(v)+"ম শ্রেণি"])}/>
    <F label="শাখা *" name="section" value={data.section} onChange={change} options={[["a","ক / A"],["b","খ / B"],["c","গ / C"]]}/>
    {Number(data.grade)>=9&&<F label="বিভাগ *" name="group" value={data.group} onChange={change} options={[["science","বিজ্ঞান"],["business","ব্যবসায় শিক্ষা"],["humanities","মানবিক"]]}/>}
   </div>}
   {step===1&&<div className="form-grid">
    <F label="পিতার নাম *" name="fatherName" value={data.fatherName} onChange={change}/>
    <F label="পিতার মোবাইল *" name="fatherPhone" type="tel" value={data.fatherPhone} onChange={change} placeholder="01XXXXXXXXX"/>
    <F label="মাতার নাম *" name="motherName" value={data.motherName} onChange={change}/>
    <F label="মাতার মোবাইল *" name="motherPhone" type="tel" value={data.motherPhone} onChange={change} placeholder="01XXXXXXXXX"/>
    <div className="sm:col-span-2"><F label="শিক্ষার্থীর লগইন মোবাইল (প্রয়োজনে অভিভাবকের নম্বর) *" name="studentPhone" type="tel" value={data.studentPhone} onChange={change} placeholder="01712345678 অথবা +8801712345678"/></div>
    <p className="sm:col-span-2 muted text-xs">একই মোবাইল নম্বর একাধিক লগইন অ্যাকাউন্টে ব্যবহার করা যাবে না।</p>
    <div className="sm:col-span-2"><F label="বর্তমান ঠিকানা *" name="guardianAddress" value={data.guardianAddress} onChange={change}/></div>
   </div>}
   {step===2&&<div className="grid gap-6">
    <div className="form-grid">
     <F label="পূর্ববর্তী বিদ্যালয়ের নাম *" name="previousSchool" value={data.previousSchool} onChange={change}/>
     <F label="পূর্ববর্তী শ্রেণি" name="previousClass" value={data.previousClass} onChange={change} required={false}/>
     <F label="পূর্ববর্তী পরীক্ষার ফলাফল (ঐচ্ছিক)" name="previousResult" value={data.previousResult} onChange={change} required={false}/>
    </div>
    <div><h3 className="font-bold mb-3">পেমেন্ট মাধ্যম নির্বাচন</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{[
     ["mobile_banking","মোবাইল ব্যাংকিং",Smartphone],["online_banking","অনলাইন ব্যাংকিং",Landmark],["later","পরে পরিশোধ",CreditCard]
    ].map(([value,label,Icon])=><button type="button" key={value} onClick={()=>setData(v=>({...v,paymentMethod:value}))}
     className="border rounded-md p-4 flex items-center gap-3 text-left" style={{borderColor:data.paymentMethod===value?"#176b61":"#e3e9e7",background:data.paymentMethod===value?"#eff8f4":"white"}}><Icon size={21} color="#176b61"/><span className="font-bold text-xs">{label}</span></button>)}</div>
     <p className="muted text-xs mt-3 mb-0">পেমেন্ট গেটওয়ে এখনো সংযুক্ত নয়। মাধ্যম নির্বাচন করলেও কোনো অর্থ কাটা হবে না বা পেমেন্ট সম্পন্ন দেখানো হবে না। বিদ্যালয় যাচাই করে পরবর্তী নির্দেশনা দেবে।</p>
    </div>
   </div>}
   <div style={{position:"absolute",left:"-9999px"}} aria-hidden="true"><input tabIndex={-1} name="website" value={data.website} onChange={change}/></div>
   {error&&<div role="alert" className="alert error mt-5">{error}</div>}
   <div className="inline-actions mt-8 justify-between"><button type="button" className="btn" disabled={step===0||saving} onClick={()=>setStep(v=>Math.max(0,v-1))}><ArrowLeft size={15}/> পূর্ববর্তী</button><button type="submit" className="btn primary" disabled={saving}>{saving?"জমা হচ্ছে...":step===2?"আবেদন জমা দিন":"পরবর্তী ধাপ"} <ArrowRight size={15}/></button></div>
  </form></div>}
  <div className="alert my-7"><GraduationCap size={16} className="inline mr-2"/> ভর্তির চূড়ান্ত সিদ্ধান্ত বিদ্যালয় কর্তৃপক্ষের অনুমোদন সাপেক্ষ।</div>
 </main><SiteFooter/></>;
}