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
   setError("All PINs must contain exactly 5 digits");return;
  }
  if(newPin!==repeatPin){setError("The new PIN entries do not match");return}
  if(oldPin===newPin){setError("Choose a new PIN that differs from your current PIN");return}
  setError("");
  const result=await mutate("pin.change",{oldPin,newPin});
  if(!result)return;
  setOldPin("");setNewPin("");setRepeatPin("");
  // Previous sessions are revoked on the server. Sign in again with the new PIN.
  window.alert("PIN changed. Please sign in again using your new PIN.");
  await signOut(firebaseAuth());
  router.replace("/login/"+actor.role);
 }
 return <div className="panel hmrs-change-pin">
  <div className="hmrs-change-pin-head"><div className="hmrs-change-pin-icon"><LockKeyhole size={22}/></div>
   <div><h2 className="section-title">Change Your PIN</h2><p className="muted text-xs">Enter your current PIN first. After changing it, sign in again with your new PIN.</p></div></div>
  <div className="hmrs-pin-fields">
   <PinInput label="Current PIN" value={oldPin} onChange={setOldPin}/>
   <PinInput label="New PIN" value={newPin} onChange={setNewPin}/>
   <PinInput label="Confirm New PIN" value={repeatPin} onChange={setRepeatPin}/>
  </div>
  {error&&<p role="alert" className="alert error mt-3">{error}</p>}
  <button type="button" onClick={changePin} disabled={working||oldPin.length!==5||newPin.length!==5||repeatPin.length!==5}
   className="btn primary mt-4"><ShieldCheck size={16}/>{working?"Updating…":"Update PIN"}</button>
 </div>;
}
