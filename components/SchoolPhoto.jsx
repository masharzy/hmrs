"use client";
import { useEffect, useState } from "react";
export default function SchoolPhoto(){
 const [src,setSrc]=useState("/school-placeholder.svg");
 useEffect(()=>{let live=true;fetch("/api/public",{cache:"no-store"}).then(r=>r.json()).then(d=>{
  const url=d?.settings?.photoUrl;
  if(live&&typeof url==="string"&&/^https:\/\//i.test(url))setSrc(url);
 }).catch(()=>{});return()=>{live=false}},[]);
 const placeholder=src==="/school-placeholder.svg";
 return <>
  <img src={src} alt={placeholder?"বিদ্যালয় ভবনের প্রতীকী চিত্র":"বিদ্যালয়ের ভবনের ছবি"} onError={()=>setSrc("/school-placeholder.svg")} style={{width:"100%",aspectRatio:"1.42",objectFit:"cover"}}/>
  {placeholder&&<div style={{position:"absolute",top:13,right:13,background:"#fffffff0",color:"#5a6b68",fontSize:10,padding:"5px 8px",borderRadius:4}}>প্রতীকী চিত্র — প্রকৃত ছবি আপলোড সাপেক্ষ</div>}
 </>;
}