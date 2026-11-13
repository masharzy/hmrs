import {db} from "../../../lib/firebase-admin";
import {actorFrom,needRole,verifyOrigin,handleError,fail,json} from "../../../lib/server-auth";
import {studentKey} from "../../../lib/school-identity.js";
import {normalizeSelectionPack,pickSelectionStudent,selectionMarksFor,importedStudent,incompleteStudentFields,
 planStreamRollChanges,SELECTION_EXAM_NAME} from "../../../lib/selection-import.js";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const now=()=>new Date().toISOString();
const studentDoc=(store,id)=>store.collection("students").doc(id);
const rollDoc=(store,s)=>store.collection("studentRolls").doc(studentKey(s.grade,s.roll,s.group));
const error=(message,status=409)=>Object.assign(Error(message),{status});
const snapData=snap=>snap.docs.map(d=>({id:d.id,...d.data()}));
const unique=(refs)=>[...new Map(refs.filter(Boolean).map(ref=>[ref.path,ref])).values()];

async function rollMode(store,actor,mode,confirmed){
 // This button works without an Excel upload.
 const [ninth,tenth]=await Promise.all([
  store.collection("students").where("grade","==",9).limit(950).get(),
  store.collection("students").where("grade","==",10).limit(950).get()
 ]);
 const plan=planStreamRollChanges([...snapData(ninth),...snapData(tenth)]);
 if(mode==="roll-preview")return json({ok:true,rollPlan:{changes:plan.changes,conflicts:plan.conflicts,
  count:plan.changes.length}});
 if(confirmed!==true)return fail("রোল সংশোধনের আগে Preview যাচাই করে নিশ্চিত করুন",409);
 let changed=0;const failures=[];
 for(const target of plan.changes){
  try{
   await store.runTransaction(async tx=>{
    const ref=studentDoc(store,target.id);
    const from=rollDoc(store,{grade:target.grade,group:target.group,roll:target.oldRoll});
    const to=rollDoc(store,{grade:target.grade,group:target.group,roll:target.roll});
    const legacy=store.collection("studentRolls").doc(studentKey(target.grade,target.oldRoll));
    const [student,oldIndex,newIndex,legacyIndex]=await Promise.all([tx.get(ref),tx.get(from),tx.get(to),tx.get(legacy)]);
    if(!student.exists||student.data()?.deleting||student.data()?.group!==target.group||
      Number(student.data()?.roll)!==target.oldRoll||Number(student.data()?.grade)!==target.grade)
       throw error("শিক্ষার্থীর বর্তমান তথ্য পরিবর্তিত; আবার Preview করুন");
    if(newIndex.exists&&newIndex.data()?.studentId!==target.id)
       throw error("সংশোধিত রোল ইতিমধ্যে অন্য শিক্ষার্থীর");
    tx.update(ref,{roll:target.roll,updatedAt:now(),updatedBy:actor.uid});
    tx.set(to,{studentId:target.id,grade:target.grade,group:target.group,roll:target.roll},{merge:true});
    if(from.path!==to.path&&oldIndex.exists&&oldIndex.data()?.studentId===target.id)tx.delete(from);
    if(legacy.path!==to.path&&legacy.path!==from.path&&legacyIndex.exists&&legacyIndex.data()?.studentId===target.id)tx.delete(legacy);
   });changed++;
  }catch(e){failures.push({...target,reason:e.message});}
 }
 await store.collection("audit").add({actorUid:actor.uid,action:"student.rolls.normalize",
  target:"grade-9-10",at:now(),changed,failed:failures.length});
 return json({ok:true,rollApplied:{changed,conflicts:plan.conflicts,failures}});
}

export async function POST(req){
 try{
  verifyOrigin(req);
  const actor=await actorFrom(req);needRole(actor,["principal"]);
  if(Number(req.headers.get("content-length")||0)>120000)return fail("ফাইলটি অনেক বড়",413);
  const body=await req.json(),mode=body?.mode;
  if(!["preview","apply","roll-preview","roll-apply"].includes(mode))
   return fail("সঠিক Import mode দিন");
  const store=db();
  if(mode==="roll-preview"||mode==="roll-apply")
   return rollMode(store,actor,mode,body.confirmed);

  const records=normalizeSelectionPack(body.pack);
  const snap=await store.collection("students").where("grade","==",10).limit(950).get();
  const students=snapData(snap);
  const matched=[],newStudents=[],conflicts=[],skipped=[];
  let scoreRecords=0,scoreParts=0;
  for(const record of records){
   const match=pickSelectionStudent(record,students);
   if(match.status==="conflict"){
    conflicts.push({...match,row:record.row});continue;
   }
   const provisional=match.status==="matched"?match.student:importedStudent(record);
   const marks=selectionMarksFor(provisional,record);
   const item={record,student:match.student||null,marks:marks.out,
    normalizeRoll:match.normalizeRoll||false,rename:match.rename||false,skipped:marks.skipped};
   (match.status==="matched"?matched:newStudents).push(item);
   scoreRecords+=marks.out.length;
   scoreParts+=marks.out.reduce((n,v)=>n+Object.keys(v.scores).length,0);
   if(marks.skipped.length)skipped.push({name:record.name,group:record.group,roll:record.roll,subjects:marks.skipped});
  }
  const summary={total:records.length,matched:matched.length,create:newStudents.length,
   rename:matched.filter(x=>x.rename).length,review:conflicts.length,
   normalizeRolls:matched.filter(x=>x.normalizeRoll).length,
   scoreRecords,scoreParts,skippedSubjectRecords:skipped.reduce((n,s)=>n+s.subjects.length,0)};
  if(mode==="preview")return json({ok:true,summary,
    review:conflicts,skipped,
    changes:matched.filter(x=>x.rename||x.normalizeRoll).map(x=>({
      group:x.record.group,roll:x.record.roll,oldRoll:x.student.roll,
      name:x.record.name,previousName:x.student.name,rename:x.rename
    })),
    additions:newStudents.map(x=>({group:x.record.group,roll:x.record.roll,name:x.record.name}))});
  if(body.confirmed!==true)return fail("Preview যাচাই ও নিশ্চিত করতে হবে",409);
  if(!matched.length&&!newStudents.length)return fail("সব শিক্ষার্থীর পরিচয়ে দ্বন্দ্ব; কোনো ফলাফল লেখা হয়নি",409);

  const found=await store.collection("exams").where("name","==",SELECTION_EXAM_NAME).limit(3).get();
  if(found.size>1)return fail("একই নামে একাধিক পরীক্ষা রয়েছে; প্রধান শিক্ষক যাচাই করুন",409);
  const examRef=found.size?found.docs[0].ref:store.collection("exams").doc("selection-2026");
  const existingExam=await examRef.get();
  if(existingExam.exists&&existingExam.data()?.name!==SELECTION_EXAM_NAME)
   return fail("নির্বাচনী পরীক্ষার ID অন্য পরীক্ষায় ব্যবহার হয়েছে",409);
  if(!existingExam.exists){
   try{await examRef.create({name:SELECTION_EXAM_NAME,year:2026,published:false,createdBy:actor.uid,createdAt:now()})}
   catch(e){if(e.code!==6&&e.code!=="already-exists")throw e}
  }
  const result={students:0,created:0,renamed:0,normalizedRolls:0,subjects:0,cells:0,preservedExisting:0};
  const failures=[];
  // A new student exists as an unsigned roster record; no phone/PIN/user is invented.
  // All writes within each transaction are atomic and rerunnable.
  for(const item of [...matched,...newStudents]){
   const {record,marks,student}=item,creating=!student;
   const ref=creating?store.collection("students").doc():studentDoc(store,student.id);
   try{
    const attendance=(student&&item.rename)?await store.collection("attendance")
     .where("studentId","==",student.id).limit(160).get():{docs:[]};
    const prevUser=student?.uid?store.collection("users").doc(student.uid):null;
    const prevApplication=student?.applicationId?store.collection("admissions").doc(student.applicationId):null;
    const written=await store.runTransaction(async tx=>{
     const from=student?rollDoc(store,student):null;
     const to=rollDoc(store,record);
     const legacy=student?store.collection("studentRolls").doc(studentKey(student.grade,student.roll)):null;
     const markRefs=marks.map(x=>store.collection("marks").doc(examRef.id+"_"+ref.id+"_"+x.subjectId));
     const readRefs=unique([ref,to,from,legacy,prevUser,prevApplication,...attendance.docs.map(d=>d.ref),...markRefs]);
     const snaps=await Promise.all(readRefs.map(r=>tx.get(r)));
     const lookup=new Map(readRefs.map((r,i)=>[r.path,snaps[i]]));
     const current=lookup.get(ref.path),roll=lookup.get(to.path);
     if(creating){
      if(current.exists)throw error("নতুন শিক্ষার্থীর রেকর্ড ইতিমধ্যে আছে");
     }else if(!current.exists||current.data()?.deleting||current.data()?.group!==record.group||
       current.data()?.name!==student.name||Number(current.data()?.roll)!==Number(student.roll))
       throw error("শিক্ষার্থীর তথ্য পরিবর্তিত; আবার Preview করুন");
     if(roll.exists&&roll.data()?.studentId!==ref.id)
       throw error("বিভাগভিত্তিক রোল অন্য শিক্ষার্থী ব্যবহার করছেন");
     const ts=now(),newName=record.name;
     const newRoll=creating||Number(student.roll)!==record.roll;
     const rename=!creating&&student.name!==newName;
     const profile=creating?importedStudent(record,ts):
      {...current.data(),name:newName,roll:record.roll};
     const missing=incompleteStudentFields(profile);
     if(creating){
      tx.create(ref,{...profile,missingFields:missing});
     }else{
      tx.update(ref,{name:newName,roll:record.roll,
       importIncomplete:missing.length>0,missingFields:missing,
       updatedAt:ts,updatedBy:actor.uid});
     }
     tx.set(to,{studentId:ref.id,grade:10,group:record.group,roll:record.roll},{merge:true});
     if(from&&from.path!==to.path&&lookup.get(from.path)?.exists&&lookup.get(from.path)?.data()?.studentId===ref.id)
      tx.delete(from);
     if(legacy&&legacy.path!==to.path&&legacy.path!==from.path&&lookup.get(legacy.path)?.exists&&lookup.get(legacy.path)?.data()?.studentId===ref.id)
      tx.delete(legacy);
     if(rename){
      if(prevUser&&lookup.get(prevUser.path)?.exists)tx.update(prevUser,{name:newName});
      if(prevApplication&&lookup.get(prevApplication.path)?.exists)tx.update(prevApplication,{studentName:newName});
      for(const doc of attendance.docs)tx.update(doc.ref,{studentName:newName});
     }
     let subjects=0,cells=0,preserved=0;
     marks.forEach((entry)=>{
      const doc=store.collection("marks").doc(examRef.id+"_"+ref.id+"_"+entry.subjectId);
      const existing=lookup.get(doc.path),before=existing?.exists?existing.data()?.scores||{}:{};
      const additions=Object.fromEntries(Object.entries(entry.scores).filter(([part])=>before[part]===undefined||before[part]===null));
      preserved+=Object.keys(entry.scores).length-Object.keys(additions).length;
      if(!Object.keys(additions).length)return;
      tx.set(doc,{examId:examRef.id,studentId:ref.id,subjectId:entry.subjectId,grade:10,
       scores:{...before,...additions},updatedAt:ts,updatedBy:actor.uid},{merge:true});
      subjects++;cells+=Object.keys(additions).length;
     });
     return {creating,rename,newRoll,subjects,cells,preserved};
    });
    result.students++;if(written.creating)result.created++;if(written.rename)result.renamed++;
    if(!written.creating&&written.newRoll)result.normalizedRolls++;
    result.subjects+=written.subjects;result.cells+=written.cells;result.preservedExisting+=written.preserved;
   }catch(e){failures.push({group:record.group,roll:record.roll,name:record.name,reason:e.message});}
  }
  await store.collection("audit").add({actorUid:actor.uid,action:"selection.results.import",target:examRef.id,at:now(),
   ...result,failures:failures.length});
  return json({ok:true,examId:examRef.id,summary,applied:result,
   failures,review:conflicts,skippedSubjectRecords:summary.skippedSubjectRecords});
 }catch(e){return handleError(e)}
}
