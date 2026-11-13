"use client";
import { useState } from "react";
import { X, Pencil, Trash2, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { toBanglaDigits, gradeLabel } from "../lib/bangla-numbers";
import { groupNames } from "../lib/student-admin";
import {FOURTH_SUBJECT_OPTIONS,fourthSubjectSelection,selectedFourthSubject} from "../lib/academic.js";

const groups=[["science","বিজ্ঞান"],["business","ব্যবসায় শিক্ষা"],["humanities","মানবিক"]];
const labels={
 name:"শিক্ষার্থীর নাম",studentName:"আবেদনকারীর নাম",grade:"শ্রেণি",roll:"রোল",group:"বিভাগ",requestedRoll:"আবেদনের রোল",optionalSubject:"চতুর্থ বিষয়",
 phone:"শিক্ষার্থীর লগইন মোবাইল",studentPhone:"শিক্ষার্থীর মোবাইল",
 dob:"জন্মতারিখ",birthRegistration:"জন্মনিবন্ধন",gender:"লিঙ্গ",
 fatherName:"পিতার নাম",fatherPhone:"পিতার মোবাইল",
 motherName:"মাতার নাম",motherPhone:"মাতার মোবাইল",guardianAddress:"অভিভাবকের ঠিকানা",
 previousSchool:"পূর্ববর্তী বিদ্যালয়",previousClass:"পূর্ববর্তী শ্রেণি",
 previousResult:"পূর্ববর্তী ফলাফল",paymentMethod:"পেমেন্ট মাধ্যম",paymentReference:"পেমেন্ট রেফারেন্স",
 elective:"নৈর্বাচনিক বিষয়",fourthSubject:"চতুর্থ বিষয়",optionalId:"৪র্থ বিষয়"
};
const studentFields=[
 "name","grade","roll","group","phone","dob","birthRegistration","gender",
 "fatherName","fatherPhone","motherName","motherPhone","guardianAddress","previousSchool"
];
const applicantFields=[
 "studentName","grade","group","requestedRoll","optionalSubject","dob","birthRegistration","gender",
 "studentPhone","fatherName","fatherPhone","motherName","motherPhone","guardianAddress",
 "previousSchool","previousClass","previousResult","paymentMethod","paymentReference"
];
const defaults={
 science:{elective:"higher-math",fourthSubject:"agriculture",optionalId:"biology"},
 business:{elective:"agriculture",fourthSubject:"agriculture",optionalId:"agriculture"},
 humanities:{elective:"civics",fourthSubject:"agriculture",optionalId:"agriculture"}
};

export function Pager({total,page,size=25,onChange}){
 const count=Math.ceil(total/size);
 if(count<=1)return null;
 return <nav className="dashboard-pager" aria-label="তালিকার পাতা">
  <span className="muted text-xs">{toBanglaDigits((page-1)*size+1)}–{toBanglaDigits(Math.min(page*size,total))} / {toBanglaDigits(total)}</span>
  <div className="inline-actions"><button type="button" className="btn sm" disabled={page<=1} onClick={()=>onChange(page-1)}><ChevronLeft size={15}/> আগের</button>
  <span className="chip">{toBanglaDigits(page)} / {toBanglaDigits(count)}</span>
  <button type="button" className="btn sm" disabled={page>=count} onClick={()=>onChange(page+1)}>পরের <ChevronRight size={15}/></button></div>
 </nav>;
}

function choicesFor(key,values){
 if(key==="grade")return [6,7,8,9,10].map(v=>[String(v),gradeLabel(v)]);
 if(key==="group")return groups;
 if(key==="optionalSubject")return [["","পরে নির্বাচন করব"],...(values.group==="science"?[
  ["biology","জীববিজ্ঞান"],["higher-math","উচ্চতর গণিত"],["agriculture","কৃষি শিক্ষা"]
  ]:[["agriculture","কৃষি শিক্ষা"],["home-science","গার্হস্থ্য বিজ্ঞান"]])];
 if(key==="gender")return [["male","ছেলে"],["female","মেয়ে"],["other","অন্যান্য"]];
 if(key==="paymentMethod")return [["mobile_banking","মোবাইল ব্যাংকিং"],["online_banking","অনলাইন ব্যাংকিং"],["later","পরে পরিশোধ"]];
 if(key==="elective"){
  return (values.group==="science"?[["higher-math","উচ্চতর গণিত"],["agriculture","কৃষি শিক্ষা"],["home-science","গার্হস্থ্য বিজ্ঞান"]]
   :values.group==="business"?[["agriculture","কৃষি শিক্ষা"],["home-science","গার্হস্থ্য বিজ্ঞান"]]
   :[["civics","পৌরনীতি"],["economics","অর্থনীতি"]]);
 }
 if(key==="fourthSubject")return [["agriculture","কৃষি শিক্ষা"],["home-science","গার্হস্থ্য বিজ্ঞান"]];
 if(key==="optionalId")return (FOURTH_SUBJECT_OPTIONS[values.group]||[]).map(s=>[s.id,s.name]);
 return null;
}

export function PrincipalRecordEditor({type,item,working,error,onClose,onSave,canResetPin=false}){
 const isStudent=type==="student";
 const [values,setValues]=useState(()=>({...item,grade:String(item.grade),group:Number(item.grade)>=9?item.group||"science":"",
  optionalId:Number(item.grade)>=9?selectedFourthSubject({...item,group:item.group||"science"}):""}));
 const [loginPin,setLoginPin]=useState("");
 const [resetPin,setResetPin]=useState("");
 const fields=(isStudent?studentFields:applicantFields).filter(key=>!["group","requestedRoll","optionalSubject"].includes(key)||Number(values.grade)>=9);
 if(isStudent&&Number(values.grade)>=9)fields.push("optionalId");
 const change=(key,value)=>setValues(old=>{
  const next={...old,[key]:value};
  if(key==="grade"){
   if(Number(value)<9){next.group="";next.elective="";next.optionalId="";next.fourthSubject="";}
   else if(!groupNames[next.group]){next.group="science";Object.assign(next,defaults.science);}
  }
  if(key==="group"&&defaults[value])Object.assign(next,defaults[value]);
  if(key==="optionalId"&&next.group&&Number(next.grade)>=9)Object.assign(next,fourthSubjectSelection(next.group,value));

  return next;
 });
 return <div className="record-modal-backdrop" role="presentation">
  <section className="record-modal" role="dialog" aria-modal="true" aria-labelledby="record-edit-title">
   <div className="record-modal-head"><div><h2 id="record-edit-title"><Pencil size={18}/> {isStudent?"শিক্ষার্থীর তথ্য এডিট":"ভর্তি আবেদন এডিট"}</h2><p className="muted text-xs">{isStudent?item.name:item.studentName}</p></div>
    <button type="button" className="btn sm" aria-label="বন্ধ করুন" onClick={onClose} disabled={working}><X size={18}/></button></div>
   <form onSubmit={e=>{e.preventDefault();onSave(values,loginPin,resetPin)}}>
    <div className="record-modal-body">
     {error&&<p className="alert error" role="alert">{error}</p>}
     <div className="form-grid">{fields.map(key=><label className={"field "+(key==="guardianAddress"?"record-wide":"")} key={key}>
      {labels[key]}
      {key==="guardianAddress"
       ?<textarea value={values[key]??""} onChange={e=>change(key,e.target.value)} maxLength={350}/>
       :choicesFor(key,values)
        ?<select value={values[key]??""} onChange={e=>change(key,e.target.value)} required>{choicesFor(key,values).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        :<input value={values[key]??""} onChange={e=>change(key,e.target.value)}
          type={key==="dob"?"date":key==="studentPhone"||key==="phone"||key.endsWith("Phone")?"tel":"text"}
          inputMode={key==="roll"||key==="birthRegistration"||key==="previousClass"?"numeric":undefined}
          autoComplete="off" required={["name","studentName","roll","studentPhone","fatherName","motherName"].includes(key)||(key==="phone"&&!!item.uid)}/>}
     </label>)}</div>
     <p className="muted text-xs mt-4">রোল, শ্রেণি বা মোবাইল পরিবর্তন করলে পুরোনো রেকর্ড ও লগইন সংযোগ অক্ষত রাখা হবে।</p>
     {isStudent&&item.uid&&canResetPin&&<div className="hmrs-editor-incomplete">
       <strong>শিক্ষার্থীর PIN পরিবর্তন</strong>
       <p>নতুন PIN দিলে আগের PIN বদলে যাবে। শুধু ফলাফল দেখার জন্য মূল PIN না বদলে Student List-এর "Test PIN" ব্যবহার করুন।</p>
       <label className="field">নতুন ৫ সংখ্যার PIN (PIN না বদলাতে চাইলে ফাঁকা)
        <input type="password" autoComplete="new-password" inputMode="numeric" maxLength={5}
         value={resetPin} onChange={e=>setResetPin(e.target.value)} placeholder="৫ সংখ্যার PIN"/>
       </label>
      </div>}
     {isStudent&&item.importIncomplete===true&&<div className="hmrs-editor-incomplete">
       <strong>⚠ তথ্য অসম্পূর্ণ</strong>
       <p>বাকি তথ্য: {(item.missingFields||[]).join(" · ")||"শিক্ষার্থীর পরিচয় ও লগইন যাচাই করুন"}</p>
       {!item.uid&&<label className="field">অ্যাকাউন্ট চালু করতে ৫ সংখ্যার PIN (সব তথ্য পূরণ না হলে ফাঁকা রাখুন)
         <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={5}
          placeholder="৫ সংখ্যার PIN" value={loginPin} onChange={e=>setLoginPin(e.target.value)}/>
       </label>}
      </div>}
    </div>
    <div className="record-modal-actions"><button type="button" className="btn" disabled={working} onClick={onClose}>বাতিল</button><button className="btn primary" type="submit" disabled={working}>{working?"সংরক্ষণ হচ্ছে...":"পরিবর্তন সংরক্ষণ"}</button></div>
   </form>
  </section>
 </div>;
}

export function DeleteStudentModal({student,working,error,onClose,onDelete}){
 return <div className="record-modal-backdrop">
  <section className="record-modal record-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="student-delete-title" aria-describedby="student-delete-description">
   <div className="record-modal-head"><h2 id="student-delete-title"><AlertTriangle size={20}/> শিক্ষার্থী মুছে ফেলবেন?</h2>
    <button type="button" className="btn sm" onClick={onClose} disabled={working} aria-label="বন্ধ করুন"><X size={18}/></button></div>
   <div className="record-modal-body">
    <p id="student-delete-description"><b>{student.name}</b> (শ্রেণি {gradeLabel(student.grade)}, রোল {toBanglaDigits(student.roll)})-এর অ্যাকাউন্ট, হাজিরা ও পরীক্ষার নম্বর স্থায়ীভাবে মুছে যাবে। এই কাজ ফিরিয়ে আনা যাবে না।</p>
    {error&&<p role="alert" className="alert error mt-3">{error}</p>}
   </div>
   <div className="record-modal-actions"><button type="button" className="btn" onClick={onClose} disabled={working}>বাতিল</button>
    <button className="btn danger" type="button" onClick={()=>onDelete()} disabled={working}><Trash2 size={15}/> {working?"মুছে ফেলা হচ্ছে...":"হ্যাঁ, ডিলিট করুন"}</button></div>
  </section>
 </div>;
}
