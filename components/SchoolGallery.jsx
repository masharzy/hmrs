"use client";
import { useEffect,useState } from "react";
import { GraduationCap } from "lucide-react";
import { loadPublicData } from "../lib/public-client";
export default function SchoolGallery(){
 const [photos,setPhotos]=useState([]);
 useEffect(()=>{let live=true;loadPublicData().then(data=>{const s=data?.settings||{};const values=[s.photoUrl,s.photoUrl2].filter(v=>typeof v==="string"&&/^https:\/\/[^\s]+$/i.test(v));if(live)setPhotos(values)}).catch(()=>{});return()=>{live=false}},[]);
 return <div className="hmrs-school-gallery" id="school-photos">{photos.length?photos.map((src,i)=><figure className={"hmrs-school-gallery-photo photo-"+i} key={src}><img src={src} alt={"বিদ্যালয়ের ছবি "+(i+1)} onError={e=>{e.currentTarget.closest("figure")?.remove()}}/><figcaption>{i===0?"আমাদের বিদ্যালয়":"বিদ্যালয় প্রাঙ্গণ"}</figcaption></figure>):<div className="hmrs-school-gallery-empty"><GraduationCap/><strong>বিদ্যালয়ের প্রকৃত ছবি যুক্ত করুন</strong><span>প্রশাসনিক সেটিংসে দুটি ছবির HTTPS লিংক যোগ করলে এখানে দেখা যাবে।</span></div>}</div>;
}