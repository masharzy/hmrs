import "server-only";
import { db } from "./firebase-admin";
import { canAccessClass } from "./server-auth";
import { evaluateTranscript } from "./academic";
import {getPublishedStudentResults} from "./published-student-results.js";
import {findApplicantRosterMatch} from "./admission-match.js";
import { allStaffGrades, canManageHomeroom, canViewGrade, studentVisibleForTeaching, canManageSubject } from "./staff-permissions.js";

const allowed={
 student:["overview","records","results","profile"],
 teacher:["overview","students","attendance","marks","profile"],
 class_teacher:["overview","students","admissions","attendance","marks","finance","profile"],
 principal:["overview","students","admissions","attendance","marks","finance","notices","routines","accounts","security","settings","profile"]
};
const visible=(actor,item)=>canViewGrade(actor,item.grade);
const asDocs=snap=>snap.docs.map(d=>{const {section,editTokenHash,...value}=d.data();return {id:d.id,...value}});
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());

export async function getDashboardSummary(actor,store=db()){
 const date=today(),scoped=actor.role!=="principal"&&allStaffGrades(actor).length>0;
 const grades=scoped?allStaffGrades(actor):[];
 if(scoped&&!grades.length)return {students:0,applications:0,present:0,absent:0};
 const [studentsSnap,appsSnap,attSnap]=await Promise.all([
  scoped?store.collection("students").where("grade","in",grades).select("grade").get()
   :store.collection("students").count().get(),
  actor.role==="teacher"?Promise.resolve(null)
   :scoped?store.collection("admissions").where("grade","in",grades).select("grade","status").get()
   :store.collection("admissions").where("status","==","pending").count().get(),
  store.collection("attendance").where("date","==",date).select("grade","status").get()
 ]);
 const students=scoped?studentsSnap.size:studentsSnap.data().count;
 const applications=actor.role==="teacher"?0:scoped?appsSnap.docs.filter(d=>d.data().status==="pending"&&canManageHomeroom(actor,d.data().grade)).length:appsSnap.data().count;
 const attended=attSnap.docs.map(d=>d.data()).filter(x=>!scoped||grades.includes(Number(x.grade)));
 const present=attended.filter(x=>x.status==="present").length;
 return {students,applications,present,absent:attended.length-present};
}

export async function getDashboardData(actor,{section="overview",date=today(),examId=""}={}){
 if(!(allowed[actor.role]||[]).includes(section))
  throw Object.assign(Error("এই পৃষ্ঠা দেখার অনুমতি নেই"),{status:403});
 const store=db();
 // PIN settings uses the already verified identity without fetching student records.
 if(section==="profile")return {data:{}};
 if(actor.role==="student"){
  const snap=await store.collection("students").doc(actor.studentId).get();
  if(!snap.exists||snap.data()?.deleting)throw Object.assign(Error("শিক্ষার্থী পাওয়া যায়নি"),{status:404});
  const {section:oldSection,...data}=snap.data();
  const student={id:snap.id,...data},profile={actor,student,dues:student.due||0};
  if(section==="overview"){
   const published=await store.collection("exams").where("published","==",true).count().get();
   profile.publishedExams=published.data().count;
  }
  if(section==="records"){
   const attendance=await store.collection("attendance").where("studentId","==",student.id).limit(250).get();
   profile.attendance=asDocs(attendance);
  }
  if(section==="results"){
   profile.results=await getPublishedStudentResults(student,store);
  }
  return {profile};
 }
 if(section==="security")return {data:{}};
 if(section==="overview")return {data:{overview:await getDashboardSummary(actor,store)}};
 const students=()=>{
  const grades=actor.role==="principal"?[]:allStaffGrades(actor);
  if(actor.role!=="principal"&&actor.roles?.length&& !grades.length)return Promise.resolve({docs:[]});
  const base=store.collection("students");
  const query=(grades.length?base.where("grade","in",grades):base).limit(900);
  return section==="students"?query.get():query.select(
   "name","grade","roll","group","fatherPhone","motherPhone","due","elective","fourthSubject","optionalId"
  ).get();
 };
 if(section==="students"){
  const roster=asDocs(await students()).filter(s=>studentVisibleForTeaching(actor,s));
  if(actor.role==="teacher")return {data:{students:roster,pendingApplications:[]}};
  const submissions=await store.collection("admissions").where("status","==","pending").limit(450).get();
  const pendingApplications=asDocs(submissions).filter(a=>canManageHomeroom(actor,a.grade)&&a.requestedRoll)
    .map(a=>({application:a,match:findApplicantRosterMatch(a,roster,a.requestedRoll)}))
    .filter(x=>x.match.match&&!x.match.match.uid)
    .map(x=>({...x.application,matchedStudentId:x.match.match.id}));
  return {data:{students:roster,pendingApplications}};
 }
 if(section==="admissions"){
  const snap=await store.collection("admissions").orderBy("createdAt","desc").limit(350).get();
  return {data:{admissions:asDocs(snap).filter(a=>canManageHomeroom(actor,a.grade))}};
 }
 if(section==="attendance"){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Object.assign(Error("সঠিক তারিখ দিন"),{status:400});
  const [s,a]=await Promise.all([
   students(),store.collection("attendance").where("date","==",date).limit(900).get()
  ]);
  return {data:{students:asDocs(s).filter(x=>studentVisibleForTeaching(actor,x)),attendance:asDocs(a).filter(x=>visible(actor,x))}};
 }
 if(section==="marks"){
  const jobs=[
   students(),
   store.collection("exams").orderBy("createdAt","desc").limit(60).get()
  ];
  if(examId && examId.length<=150)jobs.push(store.collection("marks").where("examId","==",examId).limit(3000).get());
  const [s,e,m]=await Promise.all(jobs);
  const permittedStudents=asDocs(s).filter(x=>studentVisibleForTeaching(actor,x));
  const byId=new Map(permittedStudents.map(student=>[student.id,student]));
  return {data:{students:permittedStudents,exams:asDocs(e).filter(ex=>!ex.deleted),
    marks:m?asDocs(m).filter(x=>{const student=byId.get(x.studentId);return student&&canManageSubject(actor,student,x.subjectId)}):[]}};
 }
 if(section==="finance"){
  const [s,l]=await Promise.all([students(),store.collection("ledger").orderBy("createdAt","desc").limit(600).get()]);
  return {data:{students:asDocs(s).filter(x=>canManageHomeroom(actor,x.grade)),ledger:asDocs(l).filter(x=>canManageHomeroom(actor,x.grade))}};
 }
 if(section==="notices"){
  const snap=await store.collection("notices").orderBy("createdAt","desc").limit(100).get();
  return {data:{notices:asDocs(snap)}};
 }
 if(section==="routines"){
  const snap=await store.collection("routines").orderBy("updatedAt","desc").limit(100).get();
  return {data:{routines:asDocs(snap)}};
 }
 if(section==="accounts")return {data:{}};
 if(section==="settings"){
  const snap=await store.collection("settings").doc("school").get();
  return {data:{settings:snap.exists?snap.data():{}}};
 }
 return {data:{}};
}
