import "server-only";
import {evaluateTranscript} from "./academic.js";
import {buildClassResultMetrics} from "./result-metrics.js";
import {resultIsPublished} from "./result-publication.js";
import {examAppliesToStudent} from "./exam-scope.js";
const asDocs=snap=>snap.docs.map(d=>({id:d.id,...d.data()}));
export async function getPublishedStudentResults(student,store){
 const [examsSnap,pubsSnap,ownSnap,cohortSnap]=await Promise.all([
  store.collection("exams").orderBy("createdAt","desc").limit(50).get(),
  store.collection("resultPublications").where("studentId","==",student.id).limit(100).get(),
  store.collection("marks").where("studentId","==",student.id).limit(1000).get(),
  store.collection("students").where("grade","==",Number(student.grade)).limit(900).get()
 ]);
 const publications=new Map(asDocs(pubsSnap).map(p=>[p.examId,p]));
 const exams=asDocs(examsSnap).filter(exam=>examAppliesToStudent(exam,student)&&resultIsPublished(exam,publications.get(exam.id)));
 const own=asDocs(ownSnap);
 const group=Number(student.grade)>=9?student.group:"";
 const cohort=asDocs(cohortSnap).filter(s=>Number(s.grade)<9||s.group===group);
 const results=await Promise.all(exams.map(async exam=>{
  const marksMap=Object.fromEntries(own.filter(m=>m.examId===exam.id).map(m=>[m.subjectId,m.scores]));
  const result=evaluateTranscript(student,marksMap);
  // Public response contains only aggregate highs and rank; never peer marks or names.
  const classSnap=await store.collection("marks").where("examId","==",exam.id).limit(5000).get();
  const metrics=buildClassResultMetrics(student,cohort,asDocs(classSnap));
  return {exam,result,metrics,marks:marksMap};
 }));
 return results;
}
