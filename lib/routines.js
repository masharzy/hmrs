import { isImgBBImageUrl } from "./imgbb.js";
import { toAsciiDigits } from "./bangla-numbers.js";

export const ROUTINE_TYPES = ["class","exam"];
export const ROUTINE_GROUPS = ["all","science","business","humanities"];
export const ROUTINE_GRADES = ["all","6","7","8","9","10"];

export function normalizeRoutine(raw = {}) {
 const title=typeof raw.title==="string"?raw.title.trim():"";
 const kind=typeof raw.kind==="string"?raw.kind:"class";
 const grade=toAsciiDigits(String(raw.grade ?? "all")).trim();
 const group=grade==="9"||grade==="10"?(raw.group||"all"):"all";
 const imageUrl=typeof raw.imageUrl==="string"?raw.imageUrl.trim():"";
 if(title.length<2||title.length>140)throw Error("রুটিনের নাম ২–১৪০ অক্ষরের মধ্যে লিখুন");
 if(!ROUTINE_TYPES.includes(kind))throw Error("রুটিনের ধরন নির্বাচন করুন");
 if(!ROUTINE_GRADES.includes(grade))throw Error("সঠিক শ্রেণি নির্বাচন করুন");
 if(!ROUTINE_GROUPS.includes(group))throw Error("সঠিক বিভাগ নির্বাচন করুন");
 if(!isImgBBImageUrl(imageUrl))throw Error("আগে ImgBB-তে রুটিনের JPG, PNG বা WebP ছবি আপলোড করুন");
 return { title,kind,grade,group,imageUrl,published:raw.published===true };
}
export function routineGradeLabel(grade, group) {
 const grades={all:"সব শ্রেণি","6":"৬ষ্ঠ শ্রেণি","7":"৭ম শ্রেণি","8":"৮ম শ্রেণি","9":"৯ম শ্রেণি","10":"১০ম শ্রেণি"};
 const groups={science:"বিজ্ঞান",business:"ব্যবসায় শিক্ষা",humanities:"মানবিক"};
 return (grades[String(grade)]||"") + (groups[group] ? " · "+groups[group]:"");
}
