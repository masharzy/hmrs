"use client";
import { DashboardRouteLink } from "./DashboardShell";
import { ArrowUpRight, BookOpenCheck, CalendarCheck2, GraduationCap, UserRound, Wallet } from "lucide-react";
import { gradeLabel, toBanglaDigits } from "../lib/bangla-numbers";
import { groupNames } from "../lib/student-admin";

export default function DashboardStudentHome({profile}){
 const student=profile?.student;
 if(!student)return null;
 const entries=[
  ["Class",gradeLabel(student.grade)],
  ...(Number(student.grade)>=9?[["Group",groupNames[student.group]||"—"]]:[]),
  ["Roll",toAsciiDigits(student.roll)],
  ["Father's Name",student.fatherName],
  ["Mother's Name",student.motherName],
  ["Previous School",student.previousSchool]
 ];
 return <div className="hmrs-student-home">
  <section className="hmrs-student-hero">
   <span className="hmrs-student-hero-icon"><GraduationCap size={28}/></span>
   <div className="hmrs-student-hero-copy"><span>Student Profile</span><h2>{student.name}</h2>
    <p>{gradeLabel(student.grade)} {Number(student.grade)>=9?" · "+(groupNames[student.group]||""):""} · Roll {toAsciiDigits(student.roll)}</p>
   </div>
  </section>
  <div className="hmrs-student-summary">
   <div className="hmrs-student-summary-card"><span><Wallet size={19}/></span><div><small>Outstanding Dues</small><strong>৳ {toAsciiDigits(profile.dues||0)}</strong></div></div>
   <div className="hmrs-student-summary-card"><span><BookOpenCheck size={19}/></span><div><small>Published Exams</small><strong>{toAsciiDigits(profile.publishedExams??profile.results?.length??0)}</strong></div></div>
  </div>
  <section className="hmrs-student-info">
   <header><div><span className="hmrs-module-eyebrow">MY DETAILS</span><h3>Personal Details</h3></div><UserRound size={18}/></header>
   <div className="hmrs-student-facts">{entries.map(([label,value])=><div key={label}><small>{label}</small><strong>{value||"—"}</strong></div>)}</div>
  </section>
  <div className="hmrs-student-links">
   <DashboardRouteLink href="/dashboard/records"><CalendarCheck2 size={19}/><span><strong>Attendance & Dues</strong><small>Check your attendance and dues</small></span><ArrowUpRight size={16}/></DashboardRouteLink>
   <DashboardRouteLink href="/dashboard/results"><GraduationCap size={19}/><span><strong>Results & Marksheets</strong><small>View your published exam results</small></span><ArrowUpRight size={16}/></DashboardRouteLink>
  </div>
 </div>;
}
