import { adminAuth, db } from "../../../lib/firebase-admin";
import { actorFrom, needRole, verifyOrigin, handleError, fail, json } from "../../../lib/server-auth";
import { studentKey } from "../../../lib/school-identity.js";
import { normalizeSelectionPack, pickSelectionStudent, selectionMarksFor, SELECTION_EXAM_NAME } from "../../../lib/selection-import.js";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const now=()=>new Date().toISOString();
export async function POST(req){
 try{
  verifyOrigin(req);
  const actor=await actorFrom(req);needRole(actor,["principal"]);
  if(Number(req.headers.get("content-length")||0)>120000)return fail("ফাইলটি অনেক বড়",413);
  const body=await req.json();
  if(!["preview","apply"].includes(body.mode))return fail("সঠিক import mode দিন");
  const records=normalizeSelectionPack(body.pack);
  const store=db();
  const snapshot=await store.collection("students").where("grade","==",10).limit(950).get();
  const students=snapshot.docs.map(d=>({id:d.id,...d.data()}));
  const matched=[],review=[];
  let scoreRecords=0,parts=0,skippedSubjectRecords=0;
  for(const record of records){
   const match=pickSelectionStudent(record,students);
   if(match.status!=="matched"){review.push({...match,row:record.row});continue}
   const subjects=selectionMarksFor(match.student,record);
   matched.push({student:match.student,record,marks:subjects.out,normalizeRoll:match.normalizeRoll,skipped:subjects.skipped});
   scoreRecords+=subjects.out.length;
   parts+=subjects.out.reduce((n,v)=>n+Object.keys(v.scores).length,0);
   skippedSubjectRecords+=subjects.skipped.length;
  }
  const summary={total:records.length,matched:matched.length,review:review.length,
   normalizeRolls:matched.filter(m=>m.normalizeRoll).length,
   scoreRecords,scoreParts:parts,skippedSubjectRecords};
  if(body.mode==="preview")return json({ok:true,summary,
    review,skipped:matched.filter(x=>x.skipped.length).map(x=>({name:x.record.name,group:x.record.group,roll:x.record.roll,subjects:x.skipped}))});
  if(body.confirmed!==true)return fail("প্রয়োগের আগে ফলাফল যাচাই ও নিশ্চিত করতে হবে",409);
  if(!matched.length)return fail("একজন শিক্ষার্থীরও পরিচয় নিশ্চিত হয়নি; import করা হয়নি",409);
  const found=await store.collection("exams").where("name","==",SELECTION_EXAM_NAME).limit(3).get();
  if(found.size>1)return fail("একই নামে একাধিক পরীক্ষা রয়েছে, প্রধান শিক্ষক যাচাই করুন",409);
  const examRef=found.size?found.docs[0].ref:store.collection("exams").doc("selection-2026");
  const existingExam=await examRef.get();
  if(existingExam.exists && existingExam.data()?.name!==SELECTION_EXAM_NAME)return fail("নির্বাচনী পরীক্ষার ID অন্য পরীক্ষা ব্যবহার করছে",409);
  if(!existingExam.exists)await examRef.create({name:SELECTION_EXAM_NAME,published:false,createdBy:actor.uid,createdAt:now()});
  let imported=0,marksWritten=0,partsAdded=0,normalized=0,existingCellsKept=0;
  const failures=[];
  // Per-student Firestore transaction: safe to rerun after partial connection failure.
  // Never overwrites existing non-empty mark cells or guesses absent exam values.
  for(const item of matched){
   const {student,record,marks}=item;
   try{
    const result=await store.runTransaction(async tx=>{
     const studentRef=store.collection("students").doc(student.id);
     const newRollRef=store.collection("studentRolls").doc(studentKey(10,record.roll,record.group));
     const oldRollRef=store.collection("studentRolls").doc(studentKey(student.grade,student.roll,student.group));
     const legacyRollRef=store.collection("studentRolls").doc(studentKey(student.grade,student.roll));
     const allRefs=[studentRef,newRollRef,oldRollRef,legacyRollRef,...marks.map(entry=>store.collection("marks").doc(examRef.id+"_"+student.id+"_"+entry.subjectId))];
     const all=await Promise.all(allRefs.map(ref=>tx.get(ref)));
     const current=all[0];
     if(!current.exists||current.data()?.deleting||current.data()?.group!==record.group||
        current.data()?.name!==student.name||Number(current.data()?.roll)!==Number(student.roll))
       throw Object.assign(Error("শিক্ষার্থীর তথ্য পরিবর্তিত; পুনরায় preview করুন"),{status:409});
     if(all[1].exists&&all[1].data()?.studentId!==student.id)
       throw Object.assign(Error("নতুন বিভাগভিত্তিক রোল আগে থেকেই ব্যবহৃত"),{status:409});
     const changed=Number(student.roll)!==record.roll;
     const ts=now();
     if(changed)tx.update(studentRef,{roll:record.roll,updatedAt:ts,updatedBy:actor.uid});
     if(!all[1].exists)tx.set(newRollRef,{studentId:student.id,grade:10,group:record.group,roll:record.roll},{merge:true});
     if(changed && all[2].exists && all[2].data()?.studentId===student.id&&oldRollRef.id!==newRollRef.id)tx.delete(oldRollRef);
     if(all[3].exists && all[3].data()?.studentId===student.id&&legacyRollRef.id!==newRollRef.id&&legacyRollRef.id!==oldRollRef.id)tx.delete(legacyRollRef);
     let written=0,added=0,preserved=0;
     marks.forEach((entry,index)=>{
      const ref=allRefs[index+4],snap=all[index+4],before=snap.exists?snap.data()?.scores||{}:{};
      const additions=Object.fromEntries(Object.entries(entry.scores).filter(([part])=>before[part]===undefined||before[part]===null));
      preserved+=Object.keys(entry.scores).length-Object.keys(additions).length;
      if(!Object.keys(additions).length)return;
      tx.set(ref,{examId:examRef.id,studentId:student.id,subjectId:entry.subjectId,
       grade:10,scores:{...before,...additions},updatedBy:actor.uid,updatedAt:ts},{merge:true});
      written++;added+=Object.keys(additions).length;
     });
     return {changed,written,added,preserved};
    });
    imported++;marksWritten+=result.written;partsAdded+=result.added;existingCellsKept+=result.preserved;
    if(result.changed)normalized++;
   }catch(e){failures.push({group:record.group,roll:record.roll,name:record.name,reason:e.message});}
  }
  await store.collection("audit").add({actorUid:actor.uid,action:"selection.results.import",target:examRef.id,at:now(),imported,normalized,marksWritten,partsAdded,failures:failures.length});
  return json({ok:true,examId:examRef.id,summary,applied:{students:imported,normalizedRolls:normalized,subjects:marksWritten,cells:partsAdded,preservedExisting:existingCellsKept},failures,review,skippedSubjectRecords});
 }catch(e){return handleError(e)}
}
