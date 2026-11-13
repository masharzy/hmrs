import "server-only";
import { db } from "./firebase-admin";
import { canAccessClass } from "./server-auth";
import { evaluateTranscript } from "./academic";

const allowed={
 student:["overview","records","results","profile"],
 teacher:["overview","students","attendance","marks","profile"],
 class_teacher:["overview","students","admissions","attendance","marks","finance","profile"],
 principal:["overview","students","admissions","attendance","marks","finance","notices","routines","accounts","security","settings","profile"]
};
const visible=(actor,item)=>canAccessClass(actor,item.grade);
const asDocs=snap=>snap.docs.map(d=>{const {section,editTokenHash,...value}=d.data();return {id:d.id,...value}});
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());

export async function getDashboardSummary(actor,store=db()){
 const date=today(),scoped=actor.role==="class_teacher"||(actor.role==="teacher"&&(actor.assignedClasses||[]).length>0);
 const grades=scoped?[...new Set((actor.assignedClasses||[]).map(x=>Number(String(x).split("-")[0])).filter(v=>v>=6&&v<=10))]:[];
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
 const applications=actor.role==="teacher"?0:scoped?appsSnap.docs.filter(d=>d.data().status==="pending").length:appsSnap.data().count;
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
   const [exams,marks]=await Promise.all([
    store.collection("exams").where("published","==",true).limit(30).get(),
    store.collection("marks").where("studentId","==",student.id).limit(1000).get()
   ]);
   profile.results=asDocs(exams).map(exam=>{
    const map=Object.fromEntries(marks.docs.filter(doc=>doc.data().examId===exam.id)
     .map(doc=>[doc.data().subjectId,doc.data().scores]));
    return {exam,result:evaluateTranscript(student,map)};
   });
  }
  return {profile};
 }
 if(section==="security")return {data:{}};
 if(section==="overview")return {data:{overview:await getDashboardSummary(actor,store)}};
 const students=()=>{
  const grades=((actor.role==="class_teacher"&&section!=="marks") || (actor.role==="teacher"&&(actor.assignedClasses||[]).length>0))
   ? [...new Set((actor.assignedClasses||[]).map(x=>Number(String(x).split("-")[0])).filter(v=>v>=6&&v<=10))] : [];
  if(actor.role==="class_teacher"&&section!=="marks"&&!grades.length)return Promise.resolve({docs:[]});
  const base=store.collection("students");
  const query=(grades.length?base.where("grade","in",grades):base).limit(900);
  return section==="students"?query.get():query.select(
   "name","grade","roll","group","fatherPhone","motherPhone","due","elective","fourthSubject","optionalId"
  ).get();
 };
 if(section==="students")return {data:{students:asDocs(await students()).filter(s=>visible(actor,s))}};
 if(section==="admissions"){
  const snap=await store.collection("admissions").orderBy("createdAt","desc").limit(350).get();
  return {data:{admissions:asDocs(snap).filter(a=>visible(actor,a))}};
 }
 if(section==="attendance"){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Object.assign(Error("সঠিক তারিখ দিন"),{status:400});
  const [s,a]=await Promise.all([
   students(),store.collection("attendance").where("date","==",date).limit(900).get()
  ]);
  return {data:{students:asDocs(s).filter(x=>visible(actor,x)),attendance:asDocs(a).filter(x=>visible(actor,x))}};
 }
 if(section==="marks"){
  const jobs=[
   students(),
   store.collection("exams").orderBy("createdAt","desc").limit(60).get()
  ];
  if(examId && examId.length<=150)jobs.push(store.collection("marks").where("examId","==",examId).limit(3000).get());
  const [s,e,m]=await Promise.all(jobs);
  return {data:{students:asDocs(s).filter(x=>section==="marks"&&actor.role==="class_teacher"||visible(actor,x)),exams:asDocs(e),
   marks:m?asDocs(m).filter(x=>actor.role==="class_teacher"||visible(actor,x)):[]}};
 }
 if(section==="finance"){
  const [s,l]=await Promise.all([students(),store.collection("ledger").orderBy("createdAt","desc").limit(600).get()]);
  return {data:{students:asDocs(s).filter(x=>visible(actor,x)),ledger:asDocs(l).filter(x=>visible(actor,x))}};
 }
 if(section==="notices"){
  const snap=await store.collection("notices").orderBy("createdAt","desc").limit(100).get();
  return {data:{notices:asDocs(snap)}};
 }
 if(section==="routines"){
  const snap=await store.collection("routines").orderBy("updatedAt","desc").limit(100).get();
  return {data:{routines:asDocs(snap)}};
 }
 if(section==="accounts"){
  const snap=await store.collection("users").limit(200).get();
  return {data:{users:asDocs(snap)}};
 }
 if(section==="settings"){
  const snap=await store.collection("settings").doc("school").get();
  return {data:{settings:snap.exists?snap.data():{}}};
 }
 return {data:{}};
}
