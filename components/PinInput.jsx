"use client";
import { useRef } from "react";

const digits = text => String(text||"").replace(/[০-৯٠-٩]/g,c => {
 const bn="০১২৩৪৫৬৭৮৯", ar="٠١٢٣٤٥٦٧٨٩";
 return String(bn.includes(c)?bn.indexOf(c):ar.indexOf(c));
}).replace(/\D/g,"");

export default function PinInput({ value="", onChange, disabled=false, label="পাঁচ সংখ্যার PIN", autoFocus=false }){
 const inputs=useRef([]);
 const pin=(value||"").slice(0,5);
 function write(index,text){
   const data=digits(text).slice(0,5-index), next=pin.padEnd(5," ").split("");
   for(let i=0;i<data.length;i++)next[index+i]=data[i];
   const updated=next.join("").trimEnd().replace(/ /g,"");
   onChange(updated);
   inputs.current[Math.min(4,index+Math.max(data.length,1))]?.focus();
 }
 return <div className="pin-field">
   <div className="pin-label">{label}</div>
   <div className="pin-grid" role="group" aria-label={label}>
     {Array.from({length:5},(_,i)=><input
       key={i} ref={el=>inputs.current[i]=el} type="password"
       inputMode="numeric" pattern="[0-9]*" maxLength={1}
       autoComplete="off" autoFocus={autoFocus&&i===0}
       className="pin-cell" aria-label={"PIN digit "+(i+1)}
       value={pin[i]||""} disabled={disabled}
       onChange={e=>write(i,e.target.value)}
       onPaste={e=>{e.preventDefault();write(i,e.clipboardData.getData("text"))}}
       onKeyDown={e=>{
         if(e.key==="Backspace"){
           e.preventDefault();
           const next=pin.split("");
           if(next[i]){next[i]="";onChange(next.join(""));}
           else if(i>0){next[i-1]="";onChange(next.join(""));inputs.current[i-1]?.focus();}
         }
         if(e.key==="ArrowLeft")inputs.current[Math.max(0,i-1)]?.focus();
         if(e.key==="ArrowRight")inputs.current[Math.min(4,i+1)]?.focus();
       }}/>)}
   </div>
   <p className="muted text-xs mt-2 mb-0">শুধু ৫টি সংখ্যা। প্রথম সংখ্যা ০-ও হতে পারে।</p>
 </div>;
}
