"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { UserRound,LogIn } from "lucide-react";
import { loadPublicData } from "../lib/public-client";
const defaults=[{key:"principal",title:"প্রধান শিক্ষক",href:"/login/principal"},{key:"assistantPrincipal",title:"সহকারী প্রধান শিক্ষক",href:"/login/principal"},{key:"staffManager",title:"স্টাফ ম্যানেজার",href:"/login/principal"}];
export default function HomeLeadership(){
 const [items,setItems]=useState(defaults);
 useEffect(()=>{let live=true;loadPublicData().then(data=>{const s=data?.settings||{};const next=defaults.map(p=>({...p,name:typeof s[p.key+"Name"]==="string"&&s[p.key+"Name"].trim()?s[p.key+"Name"]:p.title+"-এর নাম",designation:typeof s[p.key+"Designation"]==="string"&&s[p.key+"Designation"].trim()?s[p.key+"Designation"]:p.title,photo:typeof s[p.key+"PhotoUrl"]==="string"&&/^https:\/\/[^\s]+$/i.test(s[p.key+"PhotoUrl"])?s[p.key+"PhotoUrl"]:""}));if(live)setItems(next)}).catch(()=>{});return()=>{live=false}},[]);
 return <div className="hmrs-leadership-grid">{items.map((p,i)=><article className={"hmrs-leader-card leader-"+i} key={p.key}><div className="hmrs-leader-photo">{p.photo?<img src={p.photo} alt={p.name}/>:<UserRound size={42}/>}</div><div className="hmrs-leader-copy"><span className="hmrs-leader-kicker">{i===2?"STAFF ADMINISTRATION":"SCHOOL LEADERSHIP"}</span><h3>{p.designation}</h3><p>{p.name}</p><Link className="btn hmrs-leader-login" href={p.href}><LogIn size={16}/> লগইন করুন</Link></div></article>)}</div>;
}