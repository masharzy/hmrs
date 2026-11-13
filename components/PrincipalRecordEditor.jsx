"use client";
import { useState } from "react";
import { X, Pencil, Trash2, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { toAsciiDigits, gradeLabel } from "../lib/bangla-numbers";
import { groupNames } from "../lib/student-admin";
import {FOURTH_SUBJECT_OPTIONS,fourthSubjectSelection,selectedFourthSubject} from "../lib/academic.js";

const groups=[["science","Science"],["business","Business Studies"],["humanities","Humanities"]];
const labels={
 name:"Student Name",studentName:"Applicant Name",grade:"Class",roll:"Roll",group:"Group",requestedRoll:"Requested Roll",optionalSubject:"Fourth Subject",
 phone:"Student Login Phone",studentPhone:"Student Phone",
 dob:"Date of Birth",birthRegistration:"Birth Registration",gender:"Gender",
 fatherName:"Father's Name",fatherPhone:"Father's Phone",
 motherName:"Mother's Name",motherPhone:"Mother's Phone",guardianAddress:"Guardian Address",
 previousSchool:"Previous School",previousClass:"Previous Class",
 previousResult:"Previous Result",paymentMethod:"Payment Method",paymentReference:"Payment Reference",
 elective:"Elective Subject",fourthSubject:"Fourth Subject",optionalId:"4th Subject"
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
 return <nav className="dashboard-pager" aria-label="List Pagination">
  <span className="muted text-xs">{toAsciiDigits((page-1)*size+1)}–{toAsciiDigits(Math.min(page*size,total))} / {toAsciiDigits(total)}</span>
  <div className="inline-actions"><button type="button" className="btn sm" disabled={page<=1} onClick={()=>onChange(page-1)}><ChevronLeft size={15}/> Previous</button>
  <span className="chip">{toAsciiDigits(page)} / {toAsciiDigits(count)}</span>
  <button type="button" className="btn sm" disabled={page>=count} onClick={()=>onChange(page+1)}>Next <ChevronRight size={15}/></button></div>
 </nav>;
}

function choicesFor(key,values){
 if(key==="grade")return [6,7,8,9,10].map(v=>[String(v),gradeLabel(v)]);
 if(key==="group")return groups;
 if(key==="optionalSubject")return [["","Choose Later"],...(values.group==="science"?[
  ["biology","Biology"],["higher-math","Higher Mathematics"],["agriculture","Agricultural Studies"]
  ]:[["agriculture","Agricultural Studies"],["home-science","Home Science"]])];
 if(key==="gender")return [["male","Male"],["female","Female"],["other","Other"]];
 if(key==="paymentMethod")return [["mobile_banking","Mobile Banking"],["online_banking","Online Banking"],["later","Pay Later"]];
 if(key==="elective"){
  return (values.group==="science"?[["higher-math","Higher Mathematics"],["agriculture","Agricultural Studies"],["home-science","Home Science"]]
   :values.group==="business"?[["agriculture","Agricultural Studies"],["home-science","Home Science"]]
   :[["civics","Civics"],["economics","Economics"]]);
 }
 if(key==="fourthSubject")return [["agriculture","Agricultural Studies"],["home-science","Home Science"]];
 if(key==="optionalId")return (FOURTH_SUBJECT_OPTIONS[values.group]||[]).map(s=>[s.id,s.name]);
 return null;
}

export function PrincipalRecordEditor({type,item,working,error,onClose,onSave,canResetPin=false}){
 const isStudent=type==="student";
 const [values,setValues]=useState(()=>({...item,grade:String(item.grade),group:Number(item.grade)>=9?item.group||"science":"",
  optionalId:Number(item.grade)>=9?selectedFourthSubject({...item,group:item.group||"science"}):""}));
 const [loginPin,setLoginPin]=useState("");
 const [resetPin,setResetPin]=useState("");
 const [secondaryPin,setSecondaryPin]=useState(""),[removeSecondary,setRemoveSecondary]=useState(false);
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
   <div className="record-modal-head"><div><h2 id="record-edit-title"><Pencil size={18}/> {isStudent?"Edit Student":"Edit Application"}</h2><p className="muted text-xs">{isStudent?item.name:item.studentName}</p></div>
    <button type="button" className="btn sm" aria-label="Close" onClick={onClose} disabled={working}><X size={18}/></button></div>
   <form onSubmit={e=>{e.preventDefault();onSave(values,loginPin,resetPin,secondaryPin,removeSecondary)}}>
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
     <p className="muted text-xs mt-4">Changing class, roll or phone will preserve the existing student records and login.</p>
     {isStudent&&item.uid&&canResetPin&&<div className="hmrs-editor-incomplete">
       <strong>Change Student PIN</strong>
       <p>Changing the main PIN disables the previous main PIN. Use a secondary PIN below to keep the main PIN.</p>
       <label className="field">New 5-digit PIN (leave blank to keep current)
        <input type="password" autoComplete="new-password" inputMode="numeric" maxLength={5}
         value={resetPin} onChange={e=>setResetPin(e.target.value)} placeholder="5-digit PIN"/>
       </label>
       <div className="hmrs-student-secondary">
        <strong>Secondary Login PIN (this student only)</strong>
        <p>The secondary PIN does not change the main PIN or affect another student. Disable it here when finished.</p>
        <label className="field">Secondary 5-digit PIN
          <input type="password" autoComplete="new-password" inputMode="numeric" maxLength={5}
           placeholder={item.secondaryPinEnabled?"Enter a PIN to replace the current secondary PIN":"New secondary PIN (optional)"}
           value={secondaryPin} disabled={removeSecondary} onChange={e=>setSecondaryPin(e.target.value)}/>
        </label>
        {item.secondaryPinEnabled&&<label className="hmrs-secondary-remove">
          <input type="checkbox" checked={removeSecondary} onChange={e=>{setRemoveSecondary(e.target.checked);setSecondaryPin("")}}/>
          Disable secondary PIN
        </label>}
       </div>
      </div>}
     {isStudent&&item.importIncomplete===true&&<div className="hmrs-editor-incomplete">
       <strong>⚠ Information Incomplete</strong>
       <p>Missing information: {(item.missingFields||[]).join(" · ")||"Verify student identity and login"}</p>
       {!item.uid&&<label className="field">5-digit PIN to activate account (leave blank if details are incomplete)
         <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={5}
          placeholder="5-digit PIN" value={loginPin} onChange={e=>setLoginPin(e.target.value)}/>
       </label>}
      </div>}
    </div>
    <div className="record-modal-actions"><button type="button" className="btn" disabled={working} onClick={onClose}>Cancel</button><button className="btn primary" type="submit" disabled={working}>{working?"Saving…":"Save Changes"}</button></div>
   </form>
  </section>
 </div>;
}

export function DeleteStudentModal({student,working,error,onClose,onDelete}){
 return <div className="record-modal-backdrop">
  <section className="record-modal record-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="student-delete-title" aria-describedby="student-delete-description">
   <div className="record-modal-head"><h2 id="student-delete-title"><AlertTriangle size={20}/> Delete Student?</h2>
    <button type="button" className="btn sm" onClick={onClose} disabled={working} aria-label="Close"><X size={18}/></button></div>
   <div className="record-modal-body">
    <p id="student-delete-description"><b>{student.name}</b> (Class {gradeLabel(student.grade)}, Roll {toAsciiDigits(student.roll)})'s account, attendance and marks will be permanently removed. This cannot be undone.</p>
    {error&&<p role="alert" className="alert error mt-3">{error}</p>}
   </div>
   <div className="record-modal-actions"><button type="button" className="btn" onClick={onClose} disabled={working}>Cancel</button>
    <button className="btn danger" type="button" onClick={()=>onDelete()} disabled={working}><Trash2 size={15}/> {working?"Deleting…":"Yes, Delete"}</button></div>
  </section>
 </div>;
}
