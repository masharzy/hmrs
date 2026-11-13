import { adminAuth, db } from "../../../lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {randomInt} from "node:crypto";
import { normalizeAdmissionData, validateAdmission, firstInvalidStep } from "../../../lib/admission-validation";
import { admissionSchema } from "../../../lib/admission-schema";
import { normalizeStudentEdit } from "../../../lib/student-admin";
import { getSubjects, getStudentSubjects, fourthSubjectSelection, selectedFourthSubject } from "../../../lib/academic";
import { getDashboardData, getDashboardSummary } from "../../../lib/dashboard-data";
import { normalizeRoutine } from "../../../lib/routines.js";
import { actorFrom, canAccessClass, classKey, cleanText, fail, handleError, json, needRole, studentKey, validGrade, verifyOrigin } from "../../../lib/server-auth";
import { sameStudentRoll } from "../../../lib/school-identity.js";
import {incompleteStudentFields} from "../../../lib/selection-import.js";
import {getPublishedStudentResults} from "../../../lib/published-student-results.js";
import {publicationKey} from "../../../lib/result-publication.js";
import {examAppliesToStudent,examStudents} from "../../../lib/exam-scope.js";
import {findApplicantRosterMatch,admissionSubjects} from "../../../lib/admission-match.js";
import {auditExamScores} from "../../../lib/result-audit.js";
import { evaluateTranscript, validateMarkForStudent, validatePartialMarkForStudent } from "../../../lib/academic";
import { toAsciiDigits, parseBanglaNumber } from "../../../lib/bangla-numbers";
import { normalizePhone, normalizePin, makePinCredential, verifyPin } from "../../../lib/phone-pin";
import { registerPhoneCredential } from "../../../lib/phone-accounts";
import { cleanAssignedClasses, cleanTeachingSubjects } from "../../../lib/teacher-subjects";
import { teacherAssignments, canManageSubject, canManageHomeroom, canViewGrade, studentVisibleForTeaching } from "../../../lib/staff-permissions.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const iso = () => new Date().toISOString();
const allowedStaff = ["teacher", "class_teacher", "principal"];
const asDocs = snap => snap.docs.map(d => { const { section, editTokenHash, ...data } = d.data(); return { id: d.id, ...data }; });
const visible = (actor, item) => canAccessClass(actor, item.grade);
const audit = (actor, action, target) => db().collection("audit").add({ actorUid: actor.uid, action, target: String(target || ""), at: iso() });

async function studentForMarks(actor,id){
  needRole(actor,allowedStaff);
  const snap=await db().collection("students").doc(id).get();
  if(!snap.exists||snap.data()?.deleting)throw Object.assign(Error("শিক্ষার্থী পাওয়া যায়নি"),{status:404});
  const {section,...value}=snap.data();
  const student={id:snap.id,...value};
  if(actor.role!=="principal"&&!studentVisibleForTeaching(actor,student))
    throw Object.assign(Error("এই শ্রেণিতে পাঠদান করার অনুমতি নেই"),{status:403});
  return student;
}

async function studentFor(actor, id) {
  const snap = await db().collection("students").doc(id).get();
  if (!snap.exists) throw Error("শিক্ষার্থী পাওয়া যায়নি");
  const { section, ...data } = snap.data();
  const student = { id: snap.id, ...data };
  if (student.deleting && actor.role !== "principal") throw Object.assign(Error("শিক্ষার্থী মুছে ফেলা হচ্ছে"), { status: 409 });
  if (actor.role === "student" ? actor.studentId !== id : !visible(actor, student))
    throw Object.assign(Error("এই শিক্ষার্থী দেখার অনুমতি নেই"), { status: 403 });
  return student;
}

export async function GET(req) {
  try {
    const actor = await actorFrom(req);
    const u = new URL(req.url);
    const resource = u.searchParams.get("resource") || "profile";
    const store = db();
    // Fast identity-only endpoint. Never load marks, attendance or exams during sign-in.
    if(resource==="identity")return json({actor});
    if(actor.role==="student"&&resource.startsWith("student.")){
      const student=await studentFor(actor,actor.studentId);
      const base={actor,student,dues:student.due||0};
      if(resource==="student.profile")return json(base);
      if(resource==="student.records"){
        const snap=await store.collection("attendance").where("studentId","==",student.id).limit(250).get();
        return json({...base,attendance:asDocs(snap)});
      }
      if(resource==="student.results"){
        return json({...base,results:await getPublishedStudentResults(student,store)});
      }
    }
    if (resource === "profile") {
      if (actor.role !== "student") return json({ actor });
      const student = await studentFor(actor, actor.studentId);
      const attendance = await store.collection("attendance").where("studentId", "==", student.id).limit(250).get();
      const dues = student.due || 0;
      const results=await getPublishedStudentResults(student,store);
      return json({ actor, student, dues, attendance: asDocs(attendance), results });
    }
    if (resource === "dashboard.data") {
      const result = await getDashboardData(actor,{
        section:u.searchParams.get("section")||"overview",
        date:u.searchParams.get("date")||undefined,
        examId:u.searchParams.get("examId")||""
      });
      return json({actor,...result});
    }
    needRole(actor, allowedStaff);
    if (resource === "overview.summary") {
      needRole(actor, allowedStaff);
      return json({summary:await getDashboardSummary(actor,store)});
    }
    if (resource === "students") {
      const snap = await store.collection("students").limit(900).get();
      return json({ items: asDocs(snap).filter(s => studentVisibleForTeaching(actor,s)) });
    }
    if (resource === "admissions") {
      needRole(actor, ["class_teacher", "principal"]);
      const snap = await store.collection("admissions").orderBy("createdAt", "desc").limit(250).get();
      return json({ items: asDocs(snap).filter(a => canManageHomeroom(actor,a.grade)) });
    }
    if (resource === "notices") {
      const snap = await store.collection("notices").orderBy("createdAt", "desc").limit(100).get();
      return json({ items: asDocs(snap) });
    }
    if(resource==="result.audit"){
      needRole(actor,["principal"]);
      const examId=cleanText(u.searchParams.get("examId"),150);
      if(!examId||examId.includes("/"))return fail("পরীক্ষা নির্বাচন করুন");
      const [ex,studentsSnap,marksSnap]=await Promise.all([
       store.collection("exams").doc(examId).get(),
       store.collection("students").limit(950).get(),
       store.collection("marks").where("examId","==",examId).limit(5000).get()
      ]);
      if(!ex.exists)return fail("পরীক্ষা পাওয়া যায়নি",404);
      return json({examId,audit:auditExamScores(examStudents(ex.data(),asDocs(studentsSnap)),asDocs(marksSnap))});
    }
    if (resource === "staff.accounts") {
      needRole(actor,["principal"]);
      const pageRaw=Number(toAsciiDigits(u.searchParams.get("page")||"1"));
      const page=Number.isSafeInteger(pageRaw)?Math.min(100,Math.max(1,pageRaw)):1;
      const q=cleanText(u.searchParams.get("q"),80).toLowerCase();
      // Only teacher roles are read; student accounts never leave the server.
      const snap=await store.collection("users").where("role","in",["teacher","class_teacher"]).limit(1000).get();
      const users=asDocs(snap).filter(item=>!item.deleting && (!q ||
        (String(item.name||"")+" "+String(item.phone||"")+" "+item.role).toLowerCase().includes(q)))
       .sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"bn")||a.id.localeCompare(b.id));
      const size=20;
      return json({items:users.slice((page-1)*size,page*size),total:users.length,page,size});
    }
    if (resource === "users") {
      needRole(actor,["principal"]);
      const snap=await store.collection("users").where("role","in",["teacher","class_teacher"]).limit(1000).get();
      return json({items:asDocs(snap)});
    }
    if (resource === "attendance") {
      const date = toAsciiDigits(u.searchParams.get("date"));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return fail("সঠিক তারিখ দিন");
      const snap = await store.collection("attendance").where("date", "==", date).limit(900).get();
      return json({ items: asDocs(snap).filter(a => visible(actor, a)) });
    }
    if (resource === "exams") {
      const snap = await store.collection("exams").orderBy("createdAt", "desc").limit(60).get();
      return json({ items: asDocs(snap) });
    }
    if (resource === "marks") {
      const examId = u.searchParams.get("examId");
      if (!examId || examId.length > 150) return fail("পরীক্ষা নির্বাচন করুন");
      const gradeValue=u.searchParams.get("grade");
      if(gradeValue && !validGrade(gradeValue))return fail("সঠিক শ্রেণি নির্বাচন করুন");
      const scoped=!!gradeValue;
      const grade=scoped?parseBanglaNumber(gradeValue):null;
      const query=store.collection("marks").where("examId","==",examId);
      const snap=await query.limit(5000).get();
      return json({ items: asDocs(snap).filter(m => (!scoped||Number(m.grade)===grade)&&canViewGrade(actor,m.grade)&&(!Array.isArray(actor.teachingSubjects)||actor.teachingSubjects.includes(m.subjectId))) });
    }
    if (resource === "ledger") {
      needRole(actor, ["principal", "class_teacher"]);
      const snap = await store.collection("ledger").orderBy("createdAt", "desc").limit(600).get();
      return json({ items: asDocs(snap).filter(l => actor.role === "principal" || visible(actor, l)) });
    }
    if (resource === "settings") {
      const snap = await store.collection("settings").doc("school").get();
      return json({ settings: snap.exists ? snap.data() : {} });
    }
    return fail("অজানা রিসোর্স");
  } catch (e) { return handleError(e); }
}

// Shared student removal path for student records and principal account management.
async function removeStudentRecords(actor,id,store,action){
 const student=await studentFor(actor,id);
      const studentRef=store.collection("students").doc(id);
      // Revoking access before deleting school records prevents further account sign-in.
      await store.runTransaction(async tx=>{
        const userRef=student.uid?store.collection("users").doc(student.uid):null;
        const [current,account]=await Promise.all([tx.get(studentRef),userRef?tx.get(userRef):null]);
        if(!current.exists)throw Object.assign(Error("শিক্ষার্থী পাওয়া যায়নি"),{status:404});
        tx.update(studentRef,{deleting:true});
        if(account?.exists)tx.update(userRef,{active:false});
      });
      if(student.uid) {
        try {await adminAuth().deleteUser(student.uid);}
        catch(e){if(e.code!=="auth/user-not-found")throw e;}
      }
      const [marks,attendance,recognitions]=await Promise.all([
        store.collection("marks").where("studentId","==",id).get(),
        store.collection("attendance").where("studentId","==",id).get(),
        student.uid?store.collection("deviceRecognitions").where("uid","==",student.uid).get():Promise.resolve({docs:[]})
      ]);
      // Delete linked records first; keep the disabled student record until cleanup finishes,
      // so an interrupted deletion can be retried by the principal.
      const refs=[...marks.docs,...attendance.docs,...recognitions.docs].map(d=>d.ref);
      if(student.uid){
        refs.push(store.collection("users").doc(student.uid),
          store.collection("loginCredentials").doc(student.uid),
          store.collection("loginSecurity").doc(student.uid));
      }
      const phone=normalizePhone(student.phone||"");
      if(phone&&student.uid){
        const mapping=await store.collection("loginPhones").doc(phone).get();
        if(mapping.exists&&mapping.data()?.uid===student.uid)refs.push(mapping.ref);
      }
      const rollRef=store.collection("studentRolls").doc(studentKey(student.grade,student.roll,student.group));
      const oldRollRef=store.collection("studentRolls").doc(studentKey(student.grade,student.roll));
      const [ownedRoll,ownedLegacy]=await Promise.all([rollRef.get(),oldRollRef.get()]);
      if(ownedRoll.exists&&ownedRoll.data()?.studentId===id)refs.push(rollRef);
      if(oldRollRef.id!==rollRef.id&&ownedLegacy.exists&&ownedLegacy.data()?.studentId===id)refs.push(oldRollRef);
      const unique=[...new Map(refs.map(ref=>[ref.path,ref])).values()];
      for(let i=0;i<unique.length;i+=400){
        const batch=store.batch();
        for(const ref of unique.slice(i,i+400))batch.delete(ref);
        await batch.commit();
      }
      if(student.applicationId){
        const linked=store.collection("admissions").doc(student.applicationId);
        if((await linked.get()).exists)await linked.update({status:"student_deleted",studentId:FieldValue.delete(),deletedAt:iso(),deletedBy:actor.uid});
      }
      await studentRef.delete();
      await audit(actor,action,id);return json({ok:true});

}

export async function POST(req) {
  let createdUid = null;
  try {
    verifyOrigin(req);
    const actor = await actorFrom(req);
    if (Number(req.headers.get("content-length") || 0) > 20000) return fail("অনুরোধটি অনেক বড়", 413);
    const body = await req.json();
    const action = cleanText(body.action, 60);
    const store = db();
    if (action === "pin.change") {
      const oldPin=normalizePin(body.oldPin),newPin=normalizePin(body.newPin);
      if(!oldPin||!newPin)return fail("বর্তমান এবং নতুন PIN পাঁচ সংখ্যার হতে হবে");
      if(oldPin===newPin)return fail("নতুন PIN আগের PIN থেকে আলাদা হতে হবে");
      const credentialRef=store.collection("loginCredentials").doc(actor.uid);
      const securityRef=store.collection("loginSecurity").doc(actor.uid);
      const credential=makePinCredential(newPin);
      const now=Date.now();
      // Limit PIN guessing through an authenticated (possibly stolen) session.
      // Failed attempts are recorded within the transaction, then returned without throwing.
      const result=await store.runTransaction(async tx=>{
        const [oldSnap,securitySnap]=await Promise.all([tx.get(credentialRef),tx.get(securityRef)]);
        const security=securitySnap.data()||{};
        if(security.locked)return {ok:false,status:423,error:"অ্যাকাউন্ট লক রয়েছে; প্রধান শিক্ষকের সঙ্গে যোগাযোগ করুন"};
        if(Number(security.pinChangeBlockedUntil||0)>now)
          return {ok:false,status:429,error:"ভুল PIN-এর কারণে কিছুক্ষণ পর আবার চেষ্টা করুন"};
        if(!oldSnap.exists||!verifyPin(oldPin,oldSnap.data())){
          const failures=Number(security.pinChangeFailures||0)+1;
          tx.set(securityRef,{
            pinChangeFailures:failures>=5?0:failures,
            pinChangeBlockedUntil:failures>=5?now+15*60*1000:0
          },{merge:true});
          return {ok:false,status:403,error:"বর্তমান PIN সঠিক নয়"};
        }
        tx.update(credentialRef,{...credential,updatedAt:iso()});
        tx.set(securityRef,{pinChangeFailures:0,pinChangeBlockedUntil:0},{merge:true});
        return {ok:true};
      });
      if(!result.ok)return fail(result.error,result.status);
      await adminAuth().revokeRefreshTokens(actor.uid);
      await audit(actor,action,actor.uid);
      return json({ok:true,relogin:true});
    }
    if (action === "application.update") {
      needRole(actor, ["principal"]);
      const id = cleanText(body.id, 150), ref = store.collection("admissions").doc(id);
      const snap = await ref.get();
      if (!snap.exists) return fail("আবেদন পাওয়া যায়নি", 404);
      if (!["pending","rejected"].includes(snap.data().status)) return fail("শুধু অনিষ্পন্ন/বাতিল আবেদন সম্পাদনা করা যাবে", 409);
      const values = normalizeAdmissionData({ ...snap.data(), ...(body.values || {}) });
      const errors = validateAdmission(values);
      if (Object.keys(errors).length) return json({ error:"আবেদনের তথ্য সঠিক নয়", fieldErrors: errors, step:firstInvalidStep(errors) }, 422);
      const parsed = admissionSchema.safeParse(values);
      if (!parsed.success) return fail("আবেদনের তথ্য যাচাই করুন");
      const { website, ...record } = parsed.data;
      await ref.update({ ...record, section:FieldValue.delete(), updatedAt:iso(), editedBy:actor.uid });
      await audit(actor, action, id); return json({ok:true});
    }
    if (action === "student.update") {
      needRole(actor, ["principal","teacher","class_teacher"]);
      const id = cleanText(body.studentId, 120);
      const old = await studentFor(actor, id);
      if (old.deleting) return fail("শিক্ষার্থী মুছে ফেলা হচ্ছে",409);
      const next = normalizeStudentEdit({ ...old, ...(body.values || {}) },{allowMissingPhone:!old.uid||old.importIncomplete===true});
      if(actor.role!=="principal"&&!visible(actor,{grade:next.grade}))
        return fail("এই শ্রেণির শিক্ষার্থীর তথ্য পরিবর্তনের অনুমতি নেই",403);
      if (next.grade >= 9) {
        let derived;
        try{derived=fourthSubjectSelection(next.group,selectedFourthSubject(next))}
        catch{return fail("শ্রেণি ও বিভাগের ৪র্থ বিষয় সঠিক নয়");}
        Object.assign(next,derived);
      }
      const isNewRoll = Number(old.grade) !== next.grade || Number(old.roll) !== next.roll || (Number(next.grade)>=9 && old.group!==next.group);
      if (isNewRoll) {
        const sameGrade = await store.collection("students").where("grade", "==", next.grade).limit(950).get();
        if (sameGrade.docs.some(d => d.id !== id && sameStudentRoll(d.data(),next)))
          return fail("এই শ্রেণি ও বিভাগে রোলটি অন্য শিক্ষার্থীর", 409);
      }
      const studentRef=store.collection("students").doc(id);
      const newRollRef=store.collection("studentRolls").doc(studentKey(next.grade,next.roll,next.group));
      const oldRollRef=store.collection("studentRolls").doc(studentKey(old.grade,old.roll,old.group));
      const legacyRollRef=Number(old.grade)>=9?store.collection("studentRolls").doc(studentKey(old.grade,old.roll)):null;
      const newPhoneRef=next.phone?store.collection("loginPhones").doc(next.phone):null;
      const prevPhone=normalizePhone(old.phone || "");
      const oldPhoneRef=prevPhone ? store.collection("loginPhones").doc(prevPhone) : null;
      const phoneChanged=next.phone!==prevPhone, rollChanged=newRollRef.id!==oldRollRef.id;
      const userRef=old.uid ? store.collection("users").doc(old.uid) : null;
      const credRef=old.uid ? store.collection("loginCredentials").doc(old.uid) : null;
      const applicationRef=old.applicationId ? store.collection("admissions").doc(old.applicationId) : null;
      // Keep cached grade and student name on existing attendance/marks in sync with edits.
      const historyChanged=Number(old.grade)!==next.grade || old.name!==next.name;
      const [historicMarks,historicAttendance]=historyChanged?await Promise.all([
        store.collection("marks").where("studentId","==",id).get(),
        store.collection("attendance").where("studentId","==",id).get()
      ]):[{docs:[]},{docs:[]}];
      if(historicMarks.size+historicAttendance.size>380)return fail("অনেক পুরোনো রেকর্ড আছে; নিরাপদভাবে পরিবর্তনের জন্য প্রশাসকের সহায়তা প্রয়োজন",409);
      await store.runTransaction(async tx=>{
        const [current,newRoll,oldRoll,newPhone,oldPhone,credential,application,legacyRoll]=await Promise.all([
          tx.get(studentRef),tx.get(newRollRef),rollChanged?tx.get(oldRollRef):null,
          phoneChanged && old.uid ? tx.get(newPhoneRef):null,
          phoneChanged && oldPhoneRef ? tx.get(oldPhoneRef):null,
          phoneChanged && credRef ? tx.get(credRef):null,
          applicationRef ? tx.get(applicationRef):null,
          legacyRollRef?tx.get(legacyRollRef):null
        ]);
        if(!current.exists||current.data()?.deleting)throw Object.assign(Error("শিক্ষার্থী পাওয়া যায়নি"),{status:404});
        if(isNewRoll && newRoll.exists && newRoll.data()?.studentId!==id)throw Object.assign(Error("এই শ্রেণিতে রোলটি অন্য শিক্ষার্থীর"),{status:409});
        if(newPhone?.exists && newPhone.data()?.uid!==old.uid)throw Object.assign(Error("লগইন মোবাইল নম্বর অন্য অ্যাকাউন্টে ব্যবহৃত হচ্ছে"),{status:409});
        const missingFields=incompleteStudentFields({...next,uid:old.uid});
        tx.update(studentRef,{...next,importIncomplete:missingFields.length>0,
         missingFields,loginPending:!old.uid,section:FieldValue.delete(),updatedAt:iso(),updatedBy:actor.uid});
        if(isNewRoll || !newRoll.exists)tx.set(newRollRef,{studentId:id,grade:next.grade,group:next.group,roll:next.roll},{merge:true});
        if(rollChanged&&oldRoll?.exists&&oldRoll.data()?.studentId===id)tx.delete(oldRollRef);
        if(legacyRoll?.exists&&legacyRoll.data()?.studentId===id&&legacyRollRef.id!==newRollRef.id)tx.delete(legacyRollRef);
        if(userRef)tx.set(userRef,{name:next.name,phone:next.phone},{merge:true});
        if(phoneChanged&&old.uid) {
          tx.set(newPhoneRef,{uid:old.uid,createdAt:iso()});
          if(oldPhone?.exists&&oldPhone.data()?.uid===old.uid)tx.delete(oldPhoneRef);
          if(credential?.exists)tx.update(credRef,{phone:next.phone});
        }
        for(const record of historicMarks.docs)tx.update(record.ref,{grade:next.grade,section:FieldValue.delete()});
        for(const record of historicAttendance.docs)tx.update(record.ref,{
          grade:next.grade,studentName:next.name,section:FieldValue.delete()
        });
        if(application?.exists)tx.update(applicationRef,{
          studentName:next.name,grade:next.grade,group:next.group,
          dob:next.dob,gender:next.gender,birthRegistration:next.birthRegistration,
          fatherName:next.fatherName,fatherPhone:next.fatherPhone,
          motherName:next.motherName,motherPhone:next.motherPhone,
          guardianAddress:next.guardianAddress,previousSchool:next.previousSchool,
          studentPhone:next.phone,section:FieldValue.delete(),updatedAt:iso()
        });
      });
      await audit(actor, action, id); return json({ok:true});
    }
    if(action==="student.previewPin"){
      needRole(actor,["principal"]);
      const studentId=cleanText(body.studentId,120);
      if(!studentId||studentId.includes("/"))return fail("শিক্ষার্থী নির্বাচন করুন");
      const snap=await store.collection("students").doc(studentId).get();
      if(!snap.exists||!snap.data()?.uid||snap.data()?.deleting)return fail("সক্রিয় শিক্ষার্থী অ্যাকাউন্ট পাওয়া যায়নি",404);
      const student=snap.data(),pin=String(randomInt(10000,100000)),expiresAt=Date.now()+10*60*1000;
      const ref=store.collection("studentPreviewPins").doc("current");
      await store.runTransaction(async tx=>{
       const previous=await tx.get(ref);
       if(previous.exists&&!previous.data()?.used&&Number(previous.data()?.expiresAt)>Date.now())
        throw Object.assign(Error("আগের test PIN-এর মেয়াদ শেষ হওয়া পর্যন্ত নতুনটি চালু করা যাবে না"),{status:409});
       tx.set(ref,{uid:student.uid,studentId,used:false,expiresAt,
        ...makePinCredential(pin),issuedBy:actor.uid,createdAt:iso()});
      });
      await audit(actor,action,studentId);
      return json({ok:true,pin,expiresAt});
    }
    if(action==="student.pin.reset"){
      needRole(actor,["principal"]);
      const id=cleanText(body.studentId,120),pin=normalizePin(body.pin);
      if(!id||id.includes("/")||!pin)return fail("শিক্ষার্থী ও নতুন ৫ সংখ্যার PIN দিন");
      const snap=await store.collection("students").doc(id).get();
      if(!snap.exists||!snap.data()?.uid)return fail("শিক্ষার্থীর অ্যাকাউন্ট সক্রিয় নয়",409);
      const uid=snap.data().uid;
      const credentials=store.collection("loginCredentials").doc(uid);
      if(!(await credentials.get()).exists)return fail("এই শিক্ষার্থীর আগের PIN সেট করা নেই",409);
      await credentials.update({...makePinCredential(pin),updatedAt:iso(),updatedBy:actor.uid});
      await adminAuth().revokeRefreshTokens(uid);
      await audit(actor,action,id);
      return json({ok:true});
    }
    if (action === "student.activate") {
      needRole(actor,["principal"]);
      const id=cleanText(body.studentId,120),pin=normalizePin(body.pin);
      if(!id||id.includes("/")||!pin)return fail("শিক্ষার্থী ও ৫ সংখ্যার PIN সঠিকভাবে দিন");
      const studentRef=store.collection("students").doc(id),snap=await studentRef.get();
      if(!snap.exists||snap.data()?.deleting)return fail("শিক্ষার্থী পাওয়া যায়নি",404);
      const student=snap.data();
      if(student.uid)return fail("এই শিক্ষার্থীর লগইন অ্যাকাউন্ট আগে থেকেই আছে",409);
      const phone=normalizePhone(student.phone||"");
      const remaining=incompleteStudentFields({...student,phone,uid:"pending"});
      if(remaining.length)return fail("অ্যাকাউন্ট চালুর আগে তথ্য দিন: "+remaining.join(", "),409);
      const user=await adminAuth().createUser({displayName:student.name});
      createdUid=user.uid;
      const phoneRef=store.collection("loginPhones").doc(phone);
      const userRef=store.collection("users").doc(user.uid);
      const credentialRef=store.collection("loginCredentials").doc(user.uid);
      await store.runTransaction(async tx=>{
       const [latest,mapping]=await Promise.all([tx.get(studentRef),tx.get(phoneRef)]);
       if(!latest.exists||latest.data()?.uid||latest.data()?.deleting||normalizePhone(latest.data()?.phone||"")!==phone)
         throw Object.assign(Error("শিক্ষার্থীর তথ্য পরিবর্তিত হয়েছে"),{status:409});
       const missing=incompleteStudentFields({...latest.data(),uid:"pending"});
       if(missing.length)throw Object.assign(Error("সব তথ্য পূরণ না হওয়ায় অ্যাকাউন্ট চালু করা যায়নি"),{status:409});
       if(mapping.exists)throw Object.assign(Error("মোবাইল নম্বর অন্য অ্যাকাউন্টে ব্যবহৃত"),{status:409});
       const now=iso();
       tx.create(phoneRef,{uid:user.uid,createdAt:now});
       tx.create(credentialRef,{...makePinCredential(pin),phone,createdAt:now});
       tx.create(userRef,{role:"student",name:student.name,phone,active:true,pinEnabled:true,studentId:id,createdAt:now});
       tx.update(studentRef,{uid:user.uid,loginPending:false,importIncomplete:false,missingFields:[],updatedAt:now,updatedBy:actor.uid});
      });
      createdUid=null;
      await audit(actor,action,id);
      return json({ok:true});
    }
    if (action === "student.delete") {
      needRole(actor,["principal"]);
      if(body.confirmed!==true)return fail("শিক্ষার্থী মুছে ফেলার আগে নিশ্চিত করুন");
      return removeStudentRecords(actor,cleanText(body.studentId,120),store,action);
    }
    if (action === "routine.save") {
      needRole(actor, ["principal"]);
      const routine=normalizeRoutine(body);
      const id=cleanText(body.id,140);
      const ref=id?store.collection("routines").doc(id):store.collection("routines").doc();
      const previous=id?await ref.get():null;
      if(id&&!previous.exists)return fail("রুটিনটি পাওয়া যায়নি",404);
      const now=iso();
      await ref.set({...routine,createdAt:previous?.data()?.createdAt||now,updatedAt:now,updatedBy:actor.uid},{merge:false});
      await audit(actor,action,ref.id);
      return json({ok:true,id:ref.id,routine:{id:ref.id,...routine,createdAt:previous?.data()?.createdAt||now,updatedAt:now,updatedBy:actor.uid}});
    }
    if (action === "routine.delete") {
      needRole(actor, ["principal"]);
      const id=cleanText(body.id,140);
      if(!id)return fail("রুটিন নির্বাচন করুন");
      const ref=store.collection("routines").doc(id);
      if(!(await ref.get()).exists)return fail("রুটিনটি পাওয়া যায়নি",404);
      await ref.delete();
      await audit(actor,action,id);
      return json({ok:true,id});
    }
    if (action === "notice.save") {
      needRole(actor, ["principal"]);
      const title = cleanText(body.title, 170), message = cleanText(body.message, 3000);
      if (!title || !message) return fail("শিরোনাম ও বিবরণ দিন");
      const imageUrl=cleanText(body.imageUrl,1200),pdfUrl=cleanText(body.pdfUrl,1200);
      const pdfName=cleanText(body.pdfName,180);
      if(imageUrl&&!/^https:\/\/(?:i\.ibb\.co|image\.ibb\.co)\/[^\s]+$/i.test(imageUrl))
        return fail("নোটিশের ছবির URL অনুমোদিত নয়");
      const publicBase=(process.env.CLOUDFLARE_R2_PUBLIC_URL||"").replace(/\/$/,"");
      if(pdfUrl&&(!publicBase.startsWith("https://")||!pdfUrl.startsWith(publicBase+"/notices/")||!/\.pdf$/i.test(pdfUrl)))
        return fail("নোটিশের PDF URL অনুমোদিত নয়");
      const ref = body.id ? store.collection("notices").doc(String(body.id)) : store.collection("notices").doc();
      const now=iso(),record={ title, message, imageUrl, pdfUrl, pdfName, published: !!body.published, updatedAt:now, updatedBy: actor.uid };
      if(!body.id)record.createdAt=now;
      await ref.set(record, { merge: true });
      await audit(actor, action, ref.id); return json({ ok: true,notice:{id:ref.id,...record} });
    }
    if (action === "notice.delete") {
      needRole(actor, ["principal"]);
      if (!body.id) return fail("নোটিশ নির্বাচন করুন");
      await store.collection("notices").doc(String(body.id)).delete();
      await audit(actor, action, body.id); return json({ ok: true,id:String(body.id) });
    }
    if (action === "settings.update") {
      needRole(actor, ["principal"]);
      const photoUrl = cleanText(body.photoUrl, 1000), subtitle = cleanText(body.subtitle, 350);
      if (photoUrl && (!/^https:\/\//i.test(photoUrl) || !/^https:\/\/[^\s]+$/i.test(photoUrl))) return fail("শুধুমাত্র HTTPS ছবি URL গ্রহণযোগ্য");
      await store.collection("settings").doc("school").set({ photoUrl, subtitle, updatedAt: iso() }, { merge: true });
      await audit(actor, action, "school"); return json({ ok: true });
    }
    if (action === "account.create") {
      needRole(actor, ["principal"]);
      const name=cleanText(body.name,120),phone=normalizePhone(body.phone),pin=normalizePin(body.pin);
      if(!name||!phone||!pin)return fail("নাম, মোবাইল নম্বর ও ৫ সংখ্যার PIN সঠিকভাবে দিন");
      const assignments=teacherAssignments({...body,roles:Array.isArray(body.roles)?body.roles:[body.role]},{});
      const user = await adminAuth().createUser({ displayName: name });
      createdUid = user.uid;
      await registerPhoneCredential({ uid: user.uid, phone, pin,
        userPatch: { name, ...assignments, active: true, createdAt: iso() }
      });
      createdUid = null;
      await audit(actor, action, user.uid); return json({ ok: true });
    }
    if (action === "account.update") {
      needRole(actor,["principal"]);
      const uid=cleanText(body.uid,128),values=body.values||{};
      if(!uid||uid.includes("/"))return fail("অ্যাকাউন্ট সঠিক নয়");
      const userRef=store.collection("users").doc(uid),current=await userRef.get();
      if(!current.exists)return fail("অ্যাকাউন্ট পাওয়া যায়নি",404);
      const before=current.data(),name=cleanText(values.name,120);
      const staffAccount=["teacher","class_teacher"].includes(before.role);
      const assignments=staffAccount?teacherAssignments({...values,roles:Array.isArray(values.roles)?values.roles:[values.role]},before):null;
      const role=staffAccount?assignments.role:values.role,active=values.active===true;
      if(!name)return fail("ব্যবহারকারীর নাম লিখুন");
      if(before.role==="student" && role!=="student")return fail("শিক্ষার্থীর ভূমিকা পরিবর্তন করা যাবে না");
      if(before.role==="principal" && role!=="principal")return fail("প্রধান শিক্ষকের ভূমিকা এখানে পরিবর্তন করা যাবে না");
      if(uid===actor.uid && (role!=="principal"||!active))return fail("নিজের প্রধান শিক্ষক অধিকার বা অ্যাকাউন্ট নিষ্ক্রিয় করা যাবে না",403);
      const oldPhone=normalizePhone(before.phone||"");
      const suppliedPhone=cleanText(values.phone,30);
      const phone=suppliedPhone?normalizePhone(suppliedPhone):oldPhone;
      if(suppliedPhone&&!phone)return fail("সঠিক লগইন মোবাইল নম্বর দিন");
      if(oldPhone&&!phone)return fail("লগইন নম্বর ফাঁকা করা যাবে না");
      const pinText=cleanText(values.pin,10),pin=pinText?normalizePin(pinText):null;
      if(pinText&&!pin)return fail("PIN অবশ্যই পাঁচ সংখ্যার হতে হবে");
      if(pin&&!phone)return fail("PIN সেট করতে আগে লগইন মোবাইল দিন");
      const assignedClasses=assignments?.assignedClasses||[];
      const teachingSubjects=assignments?.teachingSubjects||[];
      const phoneChanged=phone!==oldPhone;
      const credential=pin?makePinCredential(pin):null,now=iso();
      const credentialRef=store.collection("loginCredentials").doc(uid);
      const studentRef=before.role==="student"&&before.studentId?store.collection("students").doc(before.studentId):null;
      const oldMapping=oldPhone?store.collection("loginPhones").doc(oldPhone):null;
      const newMapping=phone?store.collection("loginPhones").doc(phone):null;
      await store.runTransaction(async tx=>{
        const [latest,oldMap,newMap,existingCredential,studentSnap]=await Promise.all([
          tx.get(userRef),oldMapping?tx.get(oldMapping):null,
          newMapping?tx.get(newMapping):null,
          tx.get(credentialRef),studentRef?tx.get(studentRef):null
        ]);
        if(!latest.exists)throw Object.assign(Error("অ্যাকাউন্ট পাওয়া যায়নি"),{status:404});
        if(latest.data().phone!==before.phone||latest.data().role!==before.role)
          throw Object.assign(Error("অ্যাকাউন্টের তথ্য পরিবর্তিত হয়েছে, আবার খুলুন"),{status:409});
        if(newMap?.exists&&newMap.data()?.uid!==uid)
          throw Object.assign(Error("এই লগইন নম্বর অন্য অ্যাকাউন্টে ব্যবহার হচ্ছে"),{status:409});
        if(studentRef&&(!studentSnap?.exists||studentSnap.data()?.deleting))
          throw Object.assign(Error("শিক্ষার্থীর অ্যাকাউন্ট পাওয়া যায়নি"),{status:404});
        tx.set(userRef,{name,phone:phone||"",role,active,
          assignedClasses,teachingSubjects,...(assignments?{roles:assignments.roles,teachingClasses:assignments.teachingClasses,classTeacherClasses:assignments.classTeacherClasses}:{}),pinEnabled:!!(existingCredential.exists||pin),updatedAt:now,updatedBy:actor.uid},{merge:true});
        if(newMapping&&(phoneChanged||!newMap?.exists))tx.set(newMapping,{uid,createdAt:now});
        if(phoneChanged&&oldMap?.exists&&oldMap.data()?.uid===uid)tx.delete(oldMapping);
        if(credential)tx.set(credentialRef,{...credential,phone,updatedAt:now},{merge:true});
        else if(phoneChanged&&existingCredential.exists)tx.update(credentialRef,{phone});
        if(studentRef)tx.update(studentRef,{name,phone:phone||"",updatedAt:now,updatedBy:actor.uid});
      });
      if(pin||!active){try{await adminAuth().revokeRefreshTokens(uid)}catch(e){if(e.code!=="auth/user-not-found")throw e}}
      await audit(actor,action,uid);
      return json({ok:true,relogin:uid===actor.uid&&!!pin});
    }
    if (action === "account.delete") {
      needRole(actor,["principal"]);
      const uid=cleanText(body.uid,128);
      if(!uid||uid.includes("/"))return fail("অ্যাকাউন্ট সঠিক নয়");
      if(uid===actor.uid)return fail("নিজের অ্যাকাউন্ট ডিলিট করা যাবে না",403);
      if(body.confirmed!==true)return fail("ডিলিট করার আগে নিশ্চিত করুন");
      const userRef=store.collection("users").doc(uid),snap=await userRef.get();
      if(!snap.exists)return fail("অ্যাকাউন্ট পাওয়া যায়নি",404);
      const user=snap.data();
      if(user.role==="student"){
        if(!user.studentId)return fail("শিক্ষার্থীর রেকর্ড খুঁজে পাওয়া যাচ্ছে না",409);
        return removeStudentRecords(actor,user.studentId,store,action);
      }
      await userRef.update({active:false,deleting:true,updatedAt:iso()});
      try{await adminAuth().deleteUser(uid)}
      catch(e){if(e.code!=="auth/user-not-found")throw e}
      const related=await store.collection("deviceRecognitions").where("uid","==",uid).get();
      const refs=[userRef,store.collection("loginCredentials").doc(uid),
        store.collection("loginSecurity").doc(uid),...related.docs.map(d=>d.ref)];
      const phone=normalizePhone(user.phone||"");
      if(phone){
        const phoneRef=store.collection("loginPhones").doc(phone);
        const mapping=await phoneRef.get();
        if(mapping.exists&&mapping.data()?.uid===uid)refs.push(phoneRef);
      }
      const batch=store.batch();
      for(const ref of refs)batch.delete(ref);
      await batch.commit();
      await audit(actor,action,uid);return json({ok:true});
    }
    if (action === "application.approve") {
      needRole(actor, ["principal", "class_teacher"]);
      const id=cleanText(body.id,150),ref=store.collection("admissions").doc(id);
      const snap=await ref.get();
      if(!snap.exists)return fail("আবেদন পাওয়া যায়নি",404);
      const application=snap.data();
      if(!canManageHomeroom(actor,application.grade))return fail("এই শ্রেণির ভর্তি অনুমোদনের অনুমতি নেই",403);
      if(application.status!=="pending")return fail("আবেদন ইতিমধ্যে নিষ্পত্তি হয়েছে",409);
      const roll=toAsciiDigits(body.roll||application.requestedRoll||"");
      const phone=normalizePhone(body.phone||application.studentPhone||application.fatherPhone);
      const pin=normalizePin(body.pin);
      if(!/^[1-9][0-9]{0,3}$/.test(roll)||!pin||!phone)
        return fail("রোল, মোবাইল নম্বর ও ৫ সংখ্যার PIN সঠিকভাবে দিন");
      const roster=await store.collection("students").where("grade","==",Number(application.grade)).limit(950).get();
      const rosterStudents=asDocs(roster);
      const found=findApplicantRosterMatch(application,rosterStudents,roll);
      if(found.conflicts.length)return fail("রোলটি অন্য সক্রিয় শিক্ষার্থী ব্যবহার করছে; যাচাই করুন",409);
      const studentRef=found.match?store.collection("students").doc(found.match.id):store.collection("students").doc();
      const studentId=studentRef.id;
      const name=found.match?.name||application.studentName;
      const opts=admissionSubjects(application);
      const selections=found.match&&!application.optionalSubject
       ?{elective:found.match.elective,fourthSubject:found.match.fourthSubject,optionalId:found.match.optionalId}
       :opts;
      const selected={
       uid:null,applicationId:id,name,phone,grade:Number(application.grade),roll:Number(roll),
       group:Number(application.grade)>=9?application.group:"",...selections,
       dob:application.dob,gender:application.gender,birthRegistration:application.birthRegistration,
       fatherName:application.fatherName,fatherPhone:application.fatherPhone,
       motherName:application.motherName,motherPhone:application.motherPhone,
       guardianAddress:application.guardianAddress,previousSchool:application.previousSchool
      };
      const newUser=await adminAuth().createUser({displayName:name});
      createdUid=newUser.uid;
      const phoneRef=store.collection("loginPhones").doc(phone);
      const credentialRef=store.collection("loginCredentials").doc(newUser.uid);
      const userRef=store.collection("users").doc(newUser.uid);
      const rollRef=store.collection("studentRolls").doc(studentKey(selected.grade,selected.roll,selected.group));
      await store.runTransaction(async tx=>{
       const [appNow,studentNow,phoneNow,rollNow]=await Promise.all([
        tx.get(ref),tx.get(studentRef),tx.get(phoneRef),tx.get(rollRef)
       ]);
       if(appNow.data()?.status!=="pending")throw Object.assign(Error("আবেদন ইতিমধ্যে নিষ্পত্তি হয়েছে"),{status:409});
       if(found.match){
        if(!studentNow.exists||studentNow.data()?.uid||studentNow.data()?.deleting||
          Number(studentNow.data()?.roll)!==Number(roll)||studentNow.data()?.group!==selected.group)
         throw Object.assign(Error("শিক্ষার্থীর অসম্পূর্ণ রেকর্ডটি পরিবর্তিত হয়েছে"),{status:409});
       }else if(studentNow.exists)throw Object.assign(Error("শিক্ষার্থী আগে থেকেই আছে"),{status:409});
       if(phoneNow.exists)throw Object.assign(Error("এই লগইন মোবাইল অন্য অ্যাকাউন্টে ব্যবহৃত"),{status:409});
       if(rollNow.exists&&rollNow.data()?.studentId!==studentId)
        throw Object.assign(Error("এই বিভাগে রোলটি অন্য শিক্ষার্থীর"),{status:409});
       const at=iso(),completed={...selected,uid:newUser.uid,updatedAt:at};
       const missing=incompleteStudentFields(completed);
       if(found.match)tx.update(studentRef,{...selected,uid:newUser.uid,loginPending:false,
        importIncomplete:missing.length>0,missingFields:missing,updatedAt:at,updatedBy:actor.uid});
       else tx.create(studentRef,{...selected,uid:newUser.uid,due:0,createdAt:at,
        loginPending:false,importIncomplete:missing.length>0,missingFields:missing});
       tx.set(rollRef,{studentId,grade:selected.grade,group:selected.group,roll:selected.roll},{merge:true});
       tx.create(phoneRef,{uid:newUser.uid,createdAt:at});
       tx.create(credentialRef,{...makePinCredential(pin),phone,createdAt:at});
       tx.create(userRef,{role:"student",name,phone,active:true,pinEnabled:true,studentId,createdAt:at});
       tx.update(ref,{status:"approved",studentId,approvedBy:actor.uid,approvedAt:at,
        approvedRosterName:name,requestedRoll:String(roll)});
      });
      createdUid=null;
      await audit(actor,action,studentId);
      return json({ok:true,studentId,linkedExisting:!!found.match});
    }
    if (action === "application.reject") {
      needRole(actor, ["class_teacher", "principal"]);
      const ref = store.collection("admissions").doc(cleanText(body.id, 150));
      const snap = await ref.get();
      if (!snap.exists || !canManageHomeroom(actor,snap.data().grade)) return fail("আবেদন পাওয়া যায়নি");
      if (snap.data().status !== "pending") return fail("ইতিমধ্যে নিষ্পত্তি হয়েছে");
      await ref.update({ status: "rejected", reviewedBy: actor.uid, reviewedAt: iso() });
      await audit(actor, action, ref.id); return json({ ok: true });
    }
    if (action === "attendance.set") {
      needRole(actor, allowedStaff);
      const student = await studentFor(actor, cleanText(body.studentId, 100));
      const date = toAsciiDigits(cleanText(body.date, 15)), status = body.status;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !["present", "absent", "left_early"].includes(status)) return fail("তারিখ বা উপস্থিতি সঠিক নয়");
      const key = date + "_" + student.id;
      await store.collection("attendance").doc(key).set({
        studentId: student.id, studentName: student.name, grade: student.grade,
        date, status, note: cleanText(body.note, 250),
        updatedBy: actor.uid, updatedAt: iso()
      });
      await audit(actor, action, key); return json({ ok: true });
    }
    if (action === "exam.create") {
      needRole(actor, ["principal", "class_teacher"]);
      const name=cleanText(body.name,130);
      if(!name)return fail("পরীক্ষার নাম লিখুন");
      const raw=body.scopeGrade??"all";
      const scopeGrade=raw==="all"||raw===""?null:parseBanglaNumber(raw);
      if(scopeGrade!==null&&![6,7,8,9,10].includes(scopeGrade))return fail("সঠিক শ্রেণি নির্বাচন করুন");
      if(actor.role!=="principal"&&(scopeGrade===null||!canManageHomeroom(actor,scopeGrade)))
       return fail("শুধু নিজের দায়িত্বপ্রাপ্ত শ্রেণির জন্য পরীক্ষা তৈরি করতে পারবেন",403);
      const ref=await store.collection("exams").add({name,scopeGrade,year:new Date().getFullYear(),
       published:false,publicationVersion:0,createdAt:iso(),createdBy:actor.uid});
      await audit(actor,action,ref.id);
      return json({ok:true,examId:ref.id,scopeGrade});
    }
    if(action==="result.publish"){
      needRole(actor,["principal"]);
      const examId=cleanText(body.examId,150),studentId=cleanText(body.studentId,150);
      if(!examId||!studentId||examId.includes("/")||studentId.includes("/"))
       return fail("পরীক্ষা ও শিক্ষার্থী নির্বাচন করুন");
      const [examSnap,studentSnap]=await Promise.all([
       store.collection("exams").doc(examId).get(),store.collection("students").doc(studentId).get()
      ]);
      if(!examSnap.exists||!studentSnap.exists||studentSnap.data()?.deleting)return fail("পরীক্ষা বা শিক্ষার্থী পাওয়া যায়নি",404);
      if(!examAppliesToStudent(examSnap.data(),studentSnap.data()))return fail("এই পরীক্ষা শিক্ষার্থীর শ্রেণির জন্য নয়",409);
      const published=body.published===true;
      if(published&&!body.allowIncomplete){
       const subjects=await store.collection("marks").where("examId","==",examId).limit(5000).get();
       const own=asDocs(subjects).filter(x=>x.studentId===studentId);
       const audit=auditExamScores([{id:studentId,...studentSnap.data()}],own);
       if(audit.incompleteCount)return json({error:"এই শিক্ষার্থীর কিছু বিষয়ের নম্বর দেওয়া হয়নি",audit},409);
      }
      const ref=store.collection("resultPublications").doc(publicationKey(examId,studentId));
      await ref.set({examId,studentId,published,publicationVersion:examSnap.data()?.publicationVersion||0,
       updatedAt:iso(),updatedBy:actor.uid},{merge:true});
      await audit(actor,action,ref.id);
      return json({ok:true,published});
    }
    if (action === "exam.publish") {
      needRole(actor, ["principal"]);
      const ref = store.collection("exams").doc(cleanText(body.examId, 150));
      const examSnap=await ref.get();
      if(!examSnap.exists)return fail("পরীক্ষা পাওয়া যায়নি");
      if(body.published===true&&!body.allowIncomplete){
       const [rosterSnap,marksSnap]=await Promise.all([
        store.collection("students").limit(950).get(),
        store.collection("marks").where("examId","==",ref.id).limit(5000).get()
       ]);
       const audit=auditExamScores(examStudents(examSnap.data(),asDocs(rosterSnap)),asDocs(marksSnap));
       if(audit.incompleteCount)return json({error:"কিছু শিক্ষার্থীর নম্বর অসম্পূর্ণ; আগে Preview দেখুন",audit},409);
      }
      // Advance the version so "publish all" also supersedes earlier per-student hides.
      await ref.update({published:!!body.published,publicationVersion:FieldValue.increment(1),updatedAt:iso()});
      await audit(actor, action, ref.id); return json({ ok: true });
    }
    if (action === "marks.set") {
      needRole(actor, allowedStaff);
      const student = await studentForMarks(actor, cleanText(body.studentId, 120));
      const examId = cleanText(body.examId, 150), subjectId = cleanText(body.subjectId, 80);
      if(!canManageSubject(actor,student,subjectId))return fail("এই বিষয় বা শ্রেণির নম্বর দেওয়ার অনুমতি নেই",403);
      
      const exam = await store.collection("exams").doc(examId).get();
      if (!exam.exists) return fail("পরীক্ষা পাওয়া যায়নি");
      if(!examAppliesToStudent(exam.data(),student))return fail("এই পরীক্ষা শিক্ষার্থীর শ্রেণির জন্য নয়",409);
      if (exam.data().published && actor.role !== "principal") return fail("প্রকাশিত ফল প্রধান শিক্ষক ছাড়া পরিবর্তন করতে পারবেন না");
      const scores = Object.fromEntries(Object.entries(body.scores||{}).map(([part,value])=>[part,parseBanglaNumber(value)]));
      validateMarkForStudent(student, subjectId, scores);
      const key = examId + "_" + student.id + "_" + subjectId;
      await store.collection("marks").doc(key).set({
        examId, studentId: student.id, subjectId, scores, grade: student.grade,
        updatedBy: actor.uid, updatedAt: iso()
      });
      await audit(actor, action, key); return json({ ok: true });
    }
    if (action === "marks.batch") {
      needRole(actor,allowedStaff);
      const examId=cleanText(body.examId,150),entries=body.entries;
      if(!Array.isArray(entries)||!entries.length||entries.length>50)return fail("সর্বোচ্চ ৫০টি নম্বর রেকর্ড একবারে সংরক্ষণ করা যাবে");
      const examSnap=await store.collection("exams").doc(examId).get();
      if(!examSnap.exists)return fail("পরীক্ষা পাওয়া যায়নি",404);
      if(examSnap.data().published&&actor.role!=="principal")return fail("প্রকাশিত পরীক্ষার নম্বর শুধু প্রধান শিক্ষক বদলাতে পারবেন",403);
      const ids=[...new Set(entries.map(e=>cleanText(e?.studentId,120)))];
      if(ids.some(id=>!id||id.includes("/")))return fail("শিক্ষার্থী সঠিক নয়");
      const snaps=await store.getAll(...ids.map(id=>store.collection("students").doc(id)));
      const studentMap=new Map(snaps.filter(s=>s.exists&&!s.data()?.deleting).map(s=>[s.id,{id:s.id,...s.data()}]));
      const batch=store.batch(),used=new Set(),now=iso();
      for(const entry of entries){
        const student=studentMap.get(cleanText(entry?.studentId,120));
        const subjectId=cleanText(entry?.subjectId,80);
        if(!student)return fail("নম্বর দেওয়ার জন্য শিক্ষার্থী পাওয়া যায়নি",404);
        if(!examAppliesToStudent(examSnap.data(),student))return fail("এই পরীক্ষা শিক্ষার্থীর শ্রেণির জন্য নয়",409);
        if(!canManageSubject(actor,student,subjectId))return fail("এই শ্রেণি বা বিষয়ে নম্বর দেওয়ার অনুমতি নেই",403);
        const subject=getStudentSubjects(student).find(s=>s.id===subjectId);
        if(!subject)return fail(student.name+" এর জন্য বিষয়টি প্রযোজ্য নয়");
        const key=examId+"_"+student.id+"_"+subjectId;
        if(used.has(key))return fail("একই বিষয়ের নম্বর একাধিকবার পাঠানো হয়েছে");
        used.add(key);
        const scores=validatePartialMarkForStudent(student,subjectId,entry.scores);
        batch.set(store.collection("marks").doc(key),{examId,studentId:student.id,subjectId,scores,grade:student.grade,updatedBy:actor.uid,updatedAt:now},{merge:true});
      }
      await batch.commit();
      await audit(actor,action,examId+" ("+entries.length+")");
      return json({ok:true,count:entries.length});
    }
    if (action === "ledger.add") {
      needRole(actor, ["principal", "class_teacher"]);
      const type = body.type, amount = parseBanglaNumber(body.amount), grade = parseBanglaNumber(body.grade),
        description = cleanText(body.description, 250);
      if (!["income", "expense"].includes(type) || !Number.isFinite(amount) || amount <= 0 || amount > 10000000 ||
          !validGrade(grade) || !description) return fail("হিসাবের তথ্য যাচাই করুন");
      if (!visible(actor, { grade })) return fail("নিজের শ্রেণির হিসাবেই পরিবর্তন করতে পারবেন", 403);
      const ref = await store.collection("ledger").add({
        type, amount, grade, description, createdBy: actor.uid, createdAt: iso()
      });
      await audit(actor, action, ref.id); return json({ ok: true });
    }
    if (action === "student.dues") {
      needRole(actor, ["principal", "class_teacher"]);
      const student = await studentFor(actor, cleanText(body.studentId, 120));
      const amount = parseBanglaNumber(body.amount);
      if (!Number.isFinite(amount) || amount < 0 || amount > 10000000) return fail("সঠিক পাওনা দিন");
      await store.collection("students").doc(student.id).update({ due: amount, dueUpdatedAt: iso() });
      await audit(actor, action, student.id); return json({ ok: true });
    }
    if (action === "student.subjects") {
      needRole(actor, ["principal", "class_teacher"]);
      const student = await studentFor(actor, cleanText(body.studentId, 120));
      if (student.grade < 9) return fail("শুধু ৯ম ও ১০ম শ্রেণির জন্য");
      const group=body.group||student.group, choice=body.optionalId;
      let subjectFields;
      try{subjectFields=fourthSubjectSelection(group,choice)}
      catch{return fail("বিভাগ অনুযায়ী শুধু সঠিক ৪র্থ বিষয় নির্বাচন করুন",400)}
      const subjects=getStudentSubjects({...student,group,...subjectFields});
      if(!subjects.some(s=>s.id===choice))return fail("এই শিক্ষার্থীর ৪র্থ বিষয়টি প্রযোজ্য নয়",400);
      await store.collection("students").doc(student.id).update({group,...subjectFields,updatedAt:iso(),updatedBy:actor.uid});
      await audit(actor, action, student.id); return json({ ok: true });
    }
    if (action === "payment.verify") {
      needRole(actor, ["principal"]);
      const ref = store.collection("admissions").doc(cleanText(body.id, 150));
      if (!(await ref.get()).exists) return fail("আবেদন পাওয়া যায়নি");
      await ref.update({ paymentStatus: "verified_manually", paymentVerifiedBy: actor.uid, paymentVerifiedAt: iso() });
      await audit(actor, action, ref.id); return json({ ok: true });
    }
    return fail("অজানা অ্যাকশন");
  } catch (e) {
    if (createdUid) { try { await adminAuth().deleteUser(createdUid); } catch {} }
    return handleError(e);
  }
}