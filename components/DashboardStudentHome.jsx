"use client";
import { DashboardRouteLink } from "./DashboardShell";
import { ArrowUpRight, BookOpenCheck, CalendarCheck2, GraduationCap, UserRound, Wallet } from "lucide-react";
import { gradeLabel, toBanglaDigits } from "../lib/bangla-numbers";
import { groupNames } from "../lib/student-admin";

export default function DashboardStudentHome({profile}){
 const student=profile?.student;
 if(!student)return null;
 const entries=[
  ["শ্রেণি",gradeLabel(student.grade)],
  ...(Number(student.grade)>=9?[["বিভাগ",groupNames[student.group]||"—"]]:[]),
  ["রোল",toBanglaDigits(student.roll)],
  ["পিতার নাম",student.fatherName],
  ["মাতার নাম",student.motherName],
  ["পূর্ববর্তী বিদ্যালয়",student.previousSchool]
 ];
 return <div className="hmrs-student-home">
  <section className="hmrs-student-hero">
   <span className="hmrs-student-hero-icon"><GraduationCap size={28}/></span>
   <div className="hmrs-student-hero-copy"><span>শিক্ষার্থী প্রোফাইল</span><h2>{student.name}</h2>
    <p>{gradeLabel(student.grade)} {Number(student.grade)>=9?" · "+(groupNames[student.group]||""):""} · রোল {toBanglaDigits(student.roll)}</p>
   </div>
  </section>
  <div className="hmrs-student-summary">
   <div className="hmrs-student-summary-card"><span><Wallet size={19}/></span><div><small>বকেয়া / পাওনা</small><strong>৳ {toBanglaDigits(profile.dues||0)}</strong></div></div>
   <div className="hmrs-student-summary-card"><span><BookOpenCheck size={19}/></span><div><small>প্রকাশিত পরীক্ষা</small><strong>{toBanglaDigits(profile.publishedExams??profile.results?.length??0)}</strong></div></div>
  </div>
  <section className="hmrs-student-info">
   <header><div><span className="hmrs-module-eyebrow">MY DETAILS</span><h3>ব্যক্তিগত তথ্য</h3></div><UserRound size={18}/></header>
   <div className="hmrs-student-facts">{entries.map(([label,value])=><div key={label}><small>{label}</small><strong>{value||"—"}</strong></div>)}</div>
  </section>
  <div className="hmrs-student-links">
   <DashboardRouteLink href="/dashboard/records"><CalendarCheck2 size={19}/><span><strong>হাজিরা ও পাওনা</strong><small>নিজের উপস্থিতি ও বকেয়া দেখুন</small></span><ArrowUpRight size={16}/></DashboardRouteLink>
   <DashboardRouteLink href="/dashboard/results"><GraduationCap size={19}/><span><strong>ফলাফল ও নম্বরপত্র</strong><small>প্রকাশিত পরীক্ষার ফলাফল দেখুন</small></span><ArrowUpRight size={16}/></DashboardRouteLink>
  </div>
 </div>;
}
