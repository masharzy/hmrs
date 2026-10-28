"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, AlertCircle, X, GraduationCap, UserRound, Users, School, CreditCard, Landmark, Smartphone, ShieldCheck } from "lucide-react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { toBanglaDigits, gradeLabel } from "../../lib/bangla-numbers";
import { ADMISSION_FIELDS, validateAdmissionStep, validateAdmission, firstInvalidStep } from "../../lib/admission-validation";

const initial={
 studentName:"",dob:"",gender:"male",grade:"6",section:"a",group:"science",
 birthRegistration:"",fatherName:"",fatherPhone:"",motherName:"",motherPhone:"",
 studentPhone:"",guardianAddress:"",previousSchool:"",previousClass:"",
 previousResult:"",paymentMethod:"later",paymentReference:"",website:""
};
const steps=[
 {title:"শিক্ষার্থীর তথ্য",description:"নাম, জন্মনিবন্ধন ও শ্রেণি",icon:UserRound},
 {title:"অভিভাবকের তথ্য",description:"যোগাযোগ ও ঠিকানা",icon:Users},
 {title:"পূর্ববর্তী বিদ্যালয়",description:"শিক্ষাগত তথ্য ও পেমেন্ট",icon:School}
];
const classOptions=[6,7,8,9,10].map(g=>[String(g),gradeLabel(g)]);
const sectionOptions=[["a","ক শাখা"],["b","খ শাখা"],["c","গ শাখা"]];
const groupOptions=[["science","বিজ্ঞান"],["business","ব্যবসায় শিক্ষা"],["humanities","মানবিক"]];
const paymentOptions=[
 {value:"mobile_banking",title:"মোবাইল ব্যাংকিং",icon:Smartphone},
 {value:"online_banking",title:"অনলাইন ব্যাংকিং",icon:Landmark},
 {value:"later",title:"পরে পরিশোধ",icon:CreditCard}
];
function AdmissionField({label,name,value,onChange,error,options,type="text",placeholder="",optional=false,inputMode,maxLength,wide=false}){
 const described=error?name+"-error":undefined;
 return <div className={"admission-field "+(error?"has-error ":"")+(wide?"admission-wide":"")} data-field={name}>
  <label htmlFor={"admission-"+name} className="admission-field-label">{label}{optional?<span className="admission-optional">ঐচ্ছিক</span>:<span className="required-indicator" aria-label="আবশ্যক">*</span>}</label>
  {options?
   <select id={"admission-"+name} name={name} value={value} aria-invalid={!!error}
     aria-describedby={described} onChange={e=>onChange(name,e.target.value)}>
    {options.map(([v,label])=><option key={v} value={v}>{label}</option>)}
   </select>:
   <input id={"admission-"+name} name={name} type={type} value={value}
     onChange={e=>onChange(name,e.target.value)} aria-invalid={!!error}
     aria-describedby={described} inputMode={inputMode}
     maxLength={maxLength} autoComplete={type==="tel"?"tel-national":"off"}
     placeholder={placeholder}/>}
  {error&&<p className="admission-field-error" id={described} role="alert"><AlertCircle size={13}/>{error}</p>}
 </div>;
}
export default function Admission(){
 const [form,setForm]=useState(initial);
 const [step,setStep]=useState(0);
 const [errors,setErrors]=useState({});
 const [toast,setToast]=useState("");
 const [saving,setSaving]=useState(false);
 const [applicationId,setApplicationId]=useState("");
 useEffect(()=>{
  if(!toast)return;
  const timer=setTimeout(()=>setToast(""),5000);
  return ()=>clearTimeout(timer);
 },[toast]);
 function change(name,value){
  setForm(f=>({...f,[name]:value}));
  setErrors(e=>{if(!e[name])return e;const next={...e};delete next[name];return next});
 }
 function focusError(fields){
  const first=Object.keys(fields)[0];
  if(!first)return;
  requestAnimationFrame(()=>{
   const control=document.getElementById("admission-"+first);
   control?.scrollIntoView({behavior:"smooth",block:"center"});
   control?.focus({preventScroll:true});
  });
 }
 function handleValidationFailed(found,message,requestedStep=step){
  setStep(requestedStep);
  setErrors(found);
  setToast(message);
  focusError(found);
 }
 function next(e){
  e.preventDefault();
  const found=validateAdmissionStep(form,step);
  if(Object.keys(found).length){
   handleValidationFailed(found,"এই ধাপে "+toBanglaDigits(Object.keys(found).length)+"টি তথ্য ঠিক করতে হবে।");
   return;
  }
  setErrors({});setToast("");setStep(n=>Math.min(n+1,2));
  window.scrollTo({top:0,behavior:"smooth"});
 }
 async function submit(e){
  e.preventDefault();
  if(saving)return;
  const found=validateAdmission(form);
  if(Object.keys(found).length){
   const invalidStep=firstInvalidStep(found);
   const stageErrors=Object.fromEntries(ADMISSION_FIELDS[invalidStep].filter(k=>found[k]).map(k=>[k,found[k]]));
   handleValidationFailed(stageErrors,"আবেদন জমা দিতে "+toBanglaDigits(Object.keys(found).length)+"টি তথ্য ঠিক করুন।",invalidStep);
   return;
  }
  setSaving(true);setToast("");setErrors({});
  try{
   const response=await fetch("/api/admissions",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok){
     if(result.fieldErrors && Object.keys(result.fieldErrors).length){
      const failedStep=firstInvalidStep(result.fieldErrors);
      const stage=failedStep<0?step:failedStep;
      const stageErrors=Object.fromEntries(ADMISSION_FIELDS[stage].filter(k=>result.fieldErrors[k]).map(k=>[k,result.fieldErrors[k]]));
      handleValidationFailed(stageErrors,result.error||"দয়া করে চিহ্নিত তথ্য সংশোধন করুন।",stage);
      return;
     }
     throw Error(result.error||"আবেদন জমা দেওয়া যায়নি।");
   }
   if(!result.applicationId)throw Error("আবেদন নম্বর পাওয়া যায়নি। অনুগ্রহ করে বিদ্যালয়ে যোগাযোগ করুন।");
   setApplicationId(result.applicationId);
   window.scrollTo({top:0,behavior:"smooth"});
  }catch(error){
   setToast(error.message||"সার্ভারে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
  }finally{setSaving(false)}
 }
 const StepIcon=steps[step].icon;
 return <><SiteHeader/><main className="admission-page">
  <div className="admission-container">
   <Link href="/" className="admission-back"><ArrowLeft size={15}/> হোমে ফিরুন</Link>
   <div className="admission-intro">
    <div className="admission-emblem"><GraduationCap size={26}/></div>
    <div><div className="kicker">HMRS SCHOOL · ADMISSION</div>
      <h1 className="admission-title">অনলাইন ভর্তি আবেদন</h1>
      <p className="muted text-sm mb-0">সঠিক তথ্য দিয়ে সহজে ভর্তি আবেদন সম্পন্ন করুন।</p>
    </div>
   </div>
   {applicationId?
    <div className="admission-success">
     <div className="admission-success-icon"><CheckCircle2 size={42}/></div>
     <h2 className="section-title">আবেদন জমা হয়েছে!</h2>
     <p className="muted">আপনার আবেদন নম্বরটি সংরক্ষণ করুন। বিদ্যালয় যাচাই করার পর ভর্তি অনুমোদনের সিদ্ধান্ত জানাবে।</p>
     <div className="admission-id">{applicationId}</div>
     <p className="muted text-sm">অনুমোদনের পর মোবাইল নম্বর ও ৫ সংখ্যার PIN দিয়ে শিক্ষার্থী পোর্টালে লগইন করতে পারবেন।</p>
     <Link className="btn primary" href="/"><ArrowLeft size={16}/> হোম পেজ</Link>
    </div>:
    <>
     <div className="admission-steps" aria-label="আবেদনের ধাপ">
      {steps.map((item,i)=><div key={item.title} className={"admission-step "+(i===step?"current":i<step?"completed":"")}>
       <div className="admission-step-index">{i<step?<Check size={17}/>:toBanglaDigits(i+1)}</div>
       <div className="admission-step-info"><strong>{item.title}</strong><small>{item.description}</small></div>
      </div>)}
     </div>
     <div className="admission-card">
      <div className="admission-card-head">
       <div className="admission-card-icon"><StepIcon size={22}/></div>
       <div><span className="admission-eyebrow">ধাপ {toBanglaDigits(step+1)} / {toBanglaDigits(3)}</span>
        <h2>{steps[step].title}</h2>
        <p>{steps[step].description}</p>
       </div>
      </div>
      <form noValidate onSubmit={step===2?submit:next}>
       {step===0&&<div className="admission-fields">
        <AdmissionField label="শিক্ষার্থীর পূর্ণ নাম" name="studentName" value={form.studentName} onChange={change} error={errors.studentName} placeholder="বাংলায় পূর্ণ নাম লিখুন" wide maxLength={110}/>
        <AdmissionField label="জন্মতারিখ" name="dob" type="date" value={form.dob} onChange={change} error={errors.dob}/>
        <AdmissionField label="জন্মনিবন্ধন নম্বর" name="birthRegistration" value={form.birthRegistration} onChange={change} error={errors.birthRegistration}
          inputMode="numeric" placeholder="১৭ সংখ্যার নম্বর (বাংলা/ইংরেজি)" maxLength={20}/>
        <AdmissionField label="লিঙ্গ" name="gender" value={form.gender} onChange={change} error={errors.gender}
          options={[["male","ছাত্র"],["female","ছাত্রী"],["other","অন্যান্য"]]}/>
        <AdmissionField label="ভর্তিচ্ছু শ্রেণি" name="grade" value={form.grade} onChange={change} error={errors.grade} options={classOptions}/>
        <AdmissionField label="শাখা" name="section" value={form.section} onChange={change} error={errors.section} options={sectionOptions}/>
        {Number(form.grade)>=9&&<AdmissionField label="বিভাগ" name="group" value={form.group} onChange={change} error={errors.group} options={groupOptions}/>}
       </div>}
       {step===1&&<div className="admission-fields">
        <AdmissionField label="পিতার নাম" name="fatherName" value={form.fatherName} onChange={change} error={errors.fatherName} placeholder="পিতার পূর্ণ নাম" maxLength={110}/>
        <AdmissionField label="পিতার মোবাইল নম্বর" name="fatherPhone" type="tel" value={form.fatherPhone} onChange={change} error={errors.fatherPhone} placeholder="০১৭১২৩৪৫৬৭৮ বা +৮৮০..." inputMode="tel" maxLength={20}/>
        <AdmissionField label="মাতার নাম" name="motherName" value={form.motherName} onChange={change} error={errors.motherName} placeholder="মাতার পূর্ণ নাম" maxLength={110}/>
        <AdmissionField label="মাতার মোবাইল নম্বর" name="motherPhone" type="tel" value={form.motherPhone} onChange={change} error={errors.motherPhone} placeholder="০১৭১২৩৪৫৬৭৮ বা +৮৮০..." inputMode="tel" maxLength={20}/>
        <AdmissionField label="শিক্ষার্থীর লগইন মোবাইল নম্বর" name="studentPhone" type="tel" value={form.studentPhone} onChange={change} error={errors.studentPhone} placeholder="০১৭১২৩৪৫৬৭৮ বা +৮৮০১৭..." inputMode="tel" maxLength={20} wide/>
        <div className="admission-helper admission-wide"><ShieldCheck size={17}/> একটি নম্বর একটি লগইন অ্যাকাউন্টের জন্য ব্যবহার করা যাবে। প্রয়োজন হলে অভিভাবকের নম্বর দিন।</div>
        <AdmissionField label="বর্তমান ঠিকানা" name="guardianAddress" value={form.guardianAddress} onChange={change} error={errors.guardianAddress} placeholder="গ্রাম, ডাকঘর, উপজেলা, জেলা" maxLength={350} wide/>
       </div>}
       {step===2&&<div className="admission-fields">
        <AdmissionField label="পূর্ববর্তী বিদ্যালয়ের নাম" name="previousSchool" value={form.previousSchool} onChange={change} error={errors.previousSchool} placeholder="যে বিদ্যালয় থেকে এসেছেন" wide maxLength={160}/>
        <AdmissionField label="পূর্ববর্তী শ্রেণি" name="previousClass" value={form.previousClass} onChange={change} error={errors.previousClass} placeholder="যেমন: ৫" optional maxLength={30}/>
        <AdmissionField label="পূর্ববর্তী পরীক্ষার ফলাফল" name="previousResult" value={form.previousResult} onChange={change} error={errors.previousResult} placeholder="যেমন: A+ বা ৮০%" optional maxLength={80}/>
        <div className="admission-wide">
         <h3 className="font-bold mb-3">পেমেন্টের মাধ্যম <span className="required-indicator">*</span></h3>
         <div className="admission-payment-grid" role="radiogroup" aria-label="পেমেন্টের মাধ্যম">
          {paymentOptions.map(item=><button key={item.value} type="button" role="radio" aria-checked={form.paymentMethod===item.value}
             className={"admission-payment "+(form.paymentMethod===item.value?"selected":"")} onClick={()=>change("paymentMethod",item.value)}>
             <item.icon size={21}/><span>{item.title}</span>
             {form.paymentMethod===item.value&&<CheckCircle2 size={17} className="admission-payment-check"/>}
           </button>)}
         </div>
         {errors.paymentMethod&&<p className="admission-field-error"><AlertCircle size={13}/>{errors.paymentMethod}</p>}
         <div className="admission-helper mt-3"><ShieldCheck size={17}/> এই ফর্মে এখনই টাকা কাটা হবে না। বিদ্যালয় কর্তৃপক্ষ পেমেন্ট যাচাই করবে।</div>
        </div>
       </div>}
       <input aria-hidden="true" tabIndex={-1} name="website" value={form.website} onChange={e=>change("website",e.target.value)} className="admission-honeypot" autoComplete="off"/>
       <div className="admission-actions">
        <button type="button" className="btn admission-previous" disabled={step===0||saving} onClick={()=>{setStep(s=>Math.max(0,s-1));setErrors({});setToast("");}}>
         <ArrowLeft size={16}/> আগের ধাপ
        </button>
        <button type="submit" className="btn primary admission-next" disabled={saving}>
         {saving?"আবেদন জমা হচ্ছে...":step===2?"আবেদন জমা দিন":"পরবর্তী ধাপ"}
         {step===2?<Check size={17}/>:<ArrowRight size={17}/>}
        </button>
       </div>
      </form>
     </div>
     <div className="admission-footer-note"><ShieldCheck size={16}/> আপনার তথ্য বিদ্যালয়ের ভর্তি প্রক্রিয়ার জন্য ব্যবহার করা হবে।</div>
    </>}
  </div>
  {toast&&<div className="admission-toast" role="alert" aria-live="assertive">
   <AlertCircle size={22}/><p>{toast}</p><button aria-label="বার্তা বন্ধ করুন" onClick={()=>setToast("")}><X size={18}/></button>
  </div>}
 </main><SiteFooter/></>;
}
