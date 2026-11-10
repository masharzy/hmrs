"use client";
import { useState } from "react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { firebaseAuth } from "../lib/firebase-client";
import PinInput from "./PinInput";

export default function ChangePinForm({actor,mutate,working}){
 const router=useRouter();
 const [oldPin,setOldPin]=useState(""),[newPin,setNewPin]=useState(""),[repeatPin,setRepeatPin]=useState("");
 const [error,setError]=useState("");
 async function changePin(){
  if(working)return;
  if(oldPin.length!==5||newPin.length!==5||repeatPin.length!==5){
   setError("সবগুলো PIN পাঁচ সংখ্যার হতে হবে");return;
  }
  if(newPin!==repeatPin){setError("নতুন PIN দুটি মিলছে না");return}
  if(oldPin===newPin){setError("নতুন PIN আগের PIN থেকে আলাদা দিন");return}
  setError("");
  const result=await mutate("pin.change",{oldPin,newPin});
  if(!result)return;
  setOldPin("");setNewPin("");setRepeatPin("");
  // Previous sessions are revoked on the server. Sign in again with the new PIN.
  window.alert("PIN সফলভাবে পরিবর্তন হয়েছে। নতুন PIN দিয়ে পুনরায় লগইন করুন।");
  await signOut(firebaseAuth());
  router.replace("/login/"+actor.role);
 }
 return <div className="panel hmrs-change-pin">
  <div className="hmrs-change-pin-head"><div className="hmrs-change-pin-icon"><LockKeyhole size={22}/></div>
   <div><h2 className="section-title">নিজের PIN পরিবর্তন</h2><p className="muted text-xs">নিরাপত্তার জন্য আগে বর্তমান PIN দিন। পরিবর্তনের পর নতুন PIN দিয়ে আবার লগইন করতে হবে।</p></div></div>
  <div className="hmrs-pin-fields">
   <PinInput label="বর্তমান PIN" value={oldPin} onChange={setOldPin}/>
   <PinInput label="নতুন PIN" value={newPin} onChange={setNewPin}/>
   <PinInput label="নতুন PIN পুনরায় লিখুন" value={repeatPin} onChange={setRepeatPin}/>
  </div>
  {error&&<p role="alert" className="alert error mt-3">{error}</p>}
  <button type="button" onClick={changePin} disabled={working||oldPin.length!==5||newPin.length!==5||repeatPin.length!==5}
   className="btn primary mt-4"><ShieldCheck size={16}/>{working?"পরিবর্তন হচ্ছে...":"PIN পরিবর্তন করুন"}</button>
 </div>;
}
