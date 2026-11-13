import { adminAuth, db } from "../../../lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { normalizeAdmissionData, validateAdmission, firstInvalidStep } from "../../../lib/admission-validation";
import { admissionSchema } from "../../../lib/admission-schema";
import { normalizeStudentEdit } from "../../../lib/student-admin";
import { getSubjects } from "../../../lib/academic";
import { getDashboardData, getDashboardSummary } from "../../../lib/dashboard-data";
import { normalizeRoutine } from "../../../lib/routines.js";
import { actorFrom, canAccessClass, classKey, cleanText, fail, handleError, json, needRole, studentKey, validGrade, verifyOrigin } from "../../../lib/server-auth";
import { evaluateTranscript, validateMarkForStudent } from "../../../lib/academic";
import { toAsciiDigits, parseBanglaNumber } from "../../../lib/bangla-numbers";
import { normalizePhone, normalizePin, makePinCredential, verifyPin } from "../../../lib/phone-pin";
import { registerPhoneCredential } from "../../../lib/phone-accounts";

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
  return {id:snap.id,...value};
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
        const [examsSnap,allMarks]=await Promise.all([
          store.collection("exams").where("published","==",true).limit(30).get(),
          store.collection("marks").where("studentId","==",student.id).limit(1000).get()
        ]);
        const results=asDocs(examsSnap).map(exam=>{
          const marks=Object.fromEntries(allMarks.docs.filter(m=>m.data().examId===exam.id)
            .map(m=>[m.data().subjectId,m.data().scores]));
          return {exam,result:evaluateTranscript(student,marks)};
        });
        return json({...base,results});
      }
    }
    if (resource === "profile") {
      if (actor.role !== "student") return json({ actor });
      const student = await studentFor(actor, actor.studentId);
      const attendance = await store.collection("attendance").where("studentId", "==", student.id).limit(250).get();
      const dues = student.due || 0;
      const examsSnap = await store.collection("exams").where("published", "==", true).limit(30).get();
      const published = asDocs(examsSnap);
      const results = [];
      const allMarks = await store.collection("marks").where("studentId", "==", student.id).limit(1000).get();
      for (const exam of published) {
        const markMap = Object.fromEntries(allMarks.docs.filter(m => m.data().examId === exam.id).map(m => [m.data().subjectId, m.data().scores]));
        results.push({ exam, result: evaluateTranscript(student, markMap) });
      }
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
      return json({ items: asDocs(snap).filter(s => visible(actor, s)) });
    }
    if (resource === "admissions") {
      needRole(actor, ["class_teacher", "principal"]);
      const snap = await store.collection("admissions").orderBy("createdAt", "desc").limit(250).get();
      return json({ items: asDocs(snap).filter(a => visible(actor, a)) });
    }
    if (resource === "notices") {
      const snap = await store.collection("notices").orderBy("createdAt", "desc").limit(100).get();
      return json({ items: asDocs(snap) });
    }
    if (resource === "users") {
      needRole(actor, ["principal"]);
      const snap = await store.collection("users").limit(1000).get();
      return json({ items: asDocs(snap) });
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
      const snap=await (scoped?query.where("grade","==",grade).limit(5000):query.limit(3000)).get();
      return json({ items: asDocs(snap).filter(m => actor.role==="class_teacher"||visible(actor,m)) });
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
      const rollRef=store.collection("studentRolls").doc(studentKey(student.grade,student.roll));
      const ownedRoll=await rollRef.get();
      if(ownedRoll.exists&&ownedRoll.data()?.studentId===id)refs.push(rollRef);
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
      needRole(actor, ["principal"]);
      const id = cleanText(body.studentId, 120);
      const old = await studentFor(actor, id);
      if (old.deleting) return fail("শিক্ষার্থী মুছে ফেলা হচ্ছে",409);
      const next = normalizeStudentEdit({ ...old, ...(body.values || {}) });
      if (next.grade >= 9) {
        const initial = { science:"higher-math", business:"agriculture", humanities:"civics" };
        try { getSubjects(next.grade, next.group, next.elective, next.fourthSubject); }
        catch { next.elective = initial[next.group]; }
        if (next.group === "humanities" && !["agriculture","home-science"].includes(next.fourthSubject))
          next.fourthSubject = "agriculture";
        const subjects = getSubjects(next.grade, next.group, next.elective, next.fourthSubject);
        const allowedOptional = next.group === "science" ? ["biology",next.elective]
          : next.group === "business" ? [next.elective] : [next.fourthSubject];
        if (!subjects.some(x => x.id === next.optionalId) || !allowedOptional.includes(next.optionalId))
          next.optionalId = allowedOptional[0];
      }
      const isNewRoll = Number(old.grade) !== next.grade || Number(old.roll) !== next.roll;
      if (isNewRoll) {
        const sameGrade = await store.collection("students").where("grade", "==", next.grade).limit(950).get();
        if (sameGrade.docs.some(d => d.id !== id && Number(d.data().roll) === next.roll))
          return fail("এই শ্রেণিতে রোলটি অন্য শিক্ষার্থীর", 409);
      }
      const studentRef=store.collection("students").doc(id);
      const newRollRef=store.collection("studentRolls").doc(studentKey(next.grade,next.roll));
      const oldRollRef=store.collection("studentRolls").doc(studentKey(old.grade,old.roll));
      const newPhoneRef=store.collection("loginPhones").doc(next.phone);
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
        const [current,newRoll,oldRoll,newPhone,oldPhone,credential,application]=await Promise.all([
          tx.get(studentRef),tx.get(newRollRef),rollChanged?tx.get(oldRollRef):null,
          phoneChanged && old.uid ? tx.get(newPhoneRef):null,
          phoneChanged && oldPhoneRef ? tx.get(oldPhoneRef):null,
          phoneChanged && credRef ? tx.get(credRef):null,
          applicationRef ? tx.get(applicationRef):null
        ]);
        if(!current.exists||current.data()?.deleting)throw Object.assign(Error("শিক্ষার্থী পাওয়া যায়নি"),{status:404});
        if(isNewRoll && newRoll.exists && newRoll.data()?.studentId!==id)throw Object.assign(Error("এই শ্রেণিতে রোলটি অন্য শিক্ষার্থীর"),{status:409});
        if(newPhone?.exists && newPhone.data()?.uid!==old.uid)throw Object.assign(Error("লগইন মোবাইল নম্বর অন্য অ্যাকাউন্টে ব্যবহৃত হচ্ছে"),{status:409});
        tx.update(studentRef,{...next,section:FieldValue.delete(),updatedAt:iso(),updatedBy:actor.uid});
        if(isNewRoll || !newRoll.exists)tx.set(newRollRef,{studentId:id,grade:next.grade,roll:next.roll},{merge:true});
        if(rollChanged&&oldRoll?.exists&&oldRoll.data()?.studentId===id)tx.delete(oldRollRef);
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
      const role = body.role, name = cleanText(body.name, 120),
        phone = normalizePhone(body.phone), pin = normalizePin(body.pin);
      if (!["teacher", "class_teacher"].includes(role) || !name || !phone || !pin)
        return fail("নাম, মোবাইল নম্বর ও ৫ সংখ্যার PIN সঠিকভাবে দিন");
      const assignedClasses = Array.isArray(body.assignedClasses)
        ? [...new Set(body.assignedClasses.map(v => toAsciiDigits(cleanText(v, 20)).split("-")[0]).filter(v => /^(6|7|8|9|10)$/.test(v)))].slice(0, 5) : [];
      if (role === "class_teacher" && !assignedClasses.length) return fail("শ্রেণি শিক্ষককে অন্তত একটি শ্রেণি দিন");
      const user = await adminAuth().createUser({ displayName: name });
      createdUid = user.uid;
      await registerPhoneCredential({ uid: user.uid, phone, pin,
        userPatch: { name, role, assignedClasses, active: true, createdAt: iso() }
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
      const role=values.role,active=values.active===true;
      if(!name)return fail("ব্যবহারকারীর নাম লিখুন");
      if(before.role==="student" && role!=="student")return fail("শিক্ষার্থীর ভূমিকা পরিবর্তন করা যাবে না");
      if(before.role!=="student" && !["teacher","class_teacher","principal"].includes(role))return fail("ভূমিকা সঠিক নয়");
      if(uid===actor.uid && (role!=="principal"||!active))return fail("নিজের প্রধান শিক্ষক অধিকার বা অ্যাকাউন্ট নিষ্ক্রিয় করা যাবে না",403);
      const oldPhone=normalizePhone(before.phone||"");
      const suppliedPhone=cleanText(values.phone,30);
      const phone=suppliedPhone?normalizePhone(suppliedPhone):oldPhone;
      if(suppliedPhone&&!phone)return fail("সঠিক লগইন মোবাইল নম্বর দিন");
      if(oldPhone&&!phone)return fail("লগইন নম্বর ফাঁকা করা যাবে না");
      const pinText=cleanText(values.pin,10),pin=pinText?normalizePin(pinText):null;
      if(pinText&&!pin)return fail("PIN অবশ্যই পাঁচ সংখ্যার হতে হবে");
      if(pin&&!phone)return fail("PIN সেট করতে আগে লগইন মোবাইল দিন");
      const assignedClasses=role==="class_teacher"&&Array.isArray(values.assignedClasses)
        ?[...new Set(values.assignedClasses.map(v=>toAsciiDigits(cleanText(v,20)).split("-")[0]).filter(v=>/^(6|7|8|9|10)$/.test(v)))].slice(0,5):[];
      if(role==="class_teacher"&&!assignedClasses.length)return fail("শ্রেণি শিক্ষককে অন্তত একটি শ্রেণি দিন");
      const phoneChanged=phone!==oldPhone;
      const credential=pin?makePinCredential(pin):null,now=iso();
      const credentialRef=store.collection("loginCredentials").doc(uid);
      const studentRef=before.role==="student"&&before.studentId?store.collection("students").doc(before.studentId):null;
      const oldMapping=oldPhone?store.collection("loginPhones").doc(oldPhone):null;
      const newMapping=phone?store.collection("loginPhones").doc(phone):null;
      await store.runTransaction(async tx=>{
        const [latest,oldMap,newMap,existingCredential,studentSnap]=await Promise.all([
          tx.get(userRef),oldMapping?tx.get(oldMapping):null,
          newMapping&&phoneChanged?tx.get(newMapping):null,
          tx.get(credentialRef),studentRef?tx.get(studentRef):null
        ]);
        if(!latest.exists)return;
        if(latest.data().phone!==before.phone||latest.data().role!==before.role)
          throw Object.assign(Error("অ্যাকাউন্টের তথ্য পরিবর্তিত হয়েছে, আবার খুলুন"),{status:409});
        if(newMap?.exists&&newMap.data()?.uid!==uid)
          throw Object.assign(Error("এই লগইন নম্বর অন্য অ্যাকাউন্টে ব্যবহার হচ্ছে"),{status:409});
        if(studentRef&&(!studentSnap?.exists||studentSnap.data()?.deleting))
          throw Object.assign(Error("শিক্ষার্থীর অ্যাকাউন্ট পাওয়া যায়নি"),{status:404});
        tx.set(userRef,{name,phone:phone||"",role,active,
          assignedClasses,pinEnabled:!!(existingCredential.exists||pin),updatedAt:now,updatedBy:actor.uid},{merge:true});
        if(phoneChanged&&newMapping)tx.set(newMapping,{uid,createdAt:now});
        if(phoneChanged&&oldMap?.exists&&oldMap.data()?.uid===uid)tx.delete(oldMapping);
        if(credential)tx.set(credentialRef,{...credential,phone,updatedAt:now},{merge:true});
        else if(phoneChanged&&existingCredential.exists)tx.update(credentialRef,{phone});
        if(studentRef)tx.update(studentRef,{name,phone:phone||"",updatedAt:now,updatedBy:actor.uid});
      });
      if(pin||!active)await adminAuth().revokeRefreshTokens(uid);
      await audit(actor,action,uid);
      return json({ok:true});
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
      const id = cleanText(body.id, 150), roll = toAsciiDigits(body.roll || ""), pin = normalizePin(body.pin);
      const ref = store.collection("admissions").doc(id);
      const snap = await ref.get();
      if (!snap.exists) return fail("আবেদন পাওয়া যায়নি");
      const application = snap.data();
      if (!visible(actor, application)) return fail("এই শ্রেণির অনুমতি নেই", 403);
      if (application.status !== "pending") return fail("আবেদন ইতিমধ্যে নিষ্পত্তি হয়েছে");
      const phone = normalizePhone(body.phone || application.studentPhone || application.fatherPhone);
      if (!/^[1-9][0-9]{0,3}$/.test(roll) || !pin || !phone) return fail("রোল, মোবাইল নম্বর ও ৫ সংখ্যার PIN সঠিকভাবে দিন");
      const studentRef = store.collection("students").doc();
      const idStudent = studentRef.id;
      const duplicateRoll = await store.collection("students").where("grade", "==", Number(application.grade)).limit(950).get();
      if (duplicateRoll.docs.some(d => Number(d.data().roll) === Number(roll))) return fail("এই শ্রেণিতে রোল ইতিমধ্যে ব্যবহৃত হয়েছে", 409);
      const rollRef = store.collection("studentRolls").doc(studentKey(application.grade,roll));
      if ((await store.collection("students").doc(idStudent).get()).exists) return fail("এই রোল ইতিমধ্যে ভর্তি আছে");
      const user = await adminAuth().createUser({ displayName: application.studentName });
      createdUid = user.uid;
      const student = {
        uid: user.uid, applicationId: id, name: application.studentName, phone, grade: Number(application.grade),
        roll: Number(roll), group: Number(application.grade) >= 9 ? application.group : "",
        elective: application.group === "science" ? "higher-math" : application.group === "humanities" ? "civics" : "agriculture",
        fourthSubject: "agriculture", optionalId: application.group === "science" ? "biology" : "agriculture", dob: application.dob, gender: application.gender,
        fatherName: application.fatherName, fatherPhone: application.fatherPhone,
        motherName: application.motherName, motherPhone: application.motherPhone,
        guardianAddress: application.guardianAddress, birthRegistration: application.birthRegistration,
        previousSchool: application.previousSchool, due: 0, createdAt: iso()
      };
      const phoneRef = store.collection("loginPhones").doc(phone);
      const credentialRef = store.collection("loginCredentials").doc(user.uid);
      const pinCredential = makePinCredential(pin);
      await store.runTransaction(async t => {
        const [currentApp, existing, existingPhone, existingRoll] = await Promise.all([
          t.get(ref), t.get(studentRef), t.get(phoneRef), t.get(rollRef)
        ]);
        if (existing.exists || existingRoll.exists || currentApp.data()?.status !== "pending") throw Error("আবেদন/রোল ইতিমধ্যে ব্যবহৃত হয়েছে");
        if (existingPhone.exists) throw Object.assign(Error("মোবাইল নম্বর অন্য অ্যাকাউন্টে ব্যবহৃত হচ্ছে"), { status: 409 });
        t.create(studentRef, student);
        t.create(rollRef, { studentId: idStudent, grade: student.grade, roll: student.roll });
        t.create(phoneRef, { uid: user.uid, createdAt: iso() });
        t.create(credentialRef, { ...pinCredential, phone, createdAt: iso() });
        t.set(store.collection("users").doc(user.uid), { role: "student", name: student.name, active: true,
          phone, pinEnabled: true, studentId: idStudent, createdAt: iso() });
        t.update(ref, { status: "approved", studentId: idStudent, approvedBy: actor.uid, approvedAt: iso() });
      });
      createdUid = null;
      await audit(actor, action, idStudent); return json({ ok: true, studentId: idStudent });
    }
    if (action === "application.reject") {
      needRole(actor, ["class_teacher", "principal"]);
      const ref = store.collection("admissions").doc(cleanText(body.id, 150));
      const snap = await ref.get();
      if (!snap.exists || !visible(actor, snap.data())) return fail("আবেদন পাওয়া যায়নি");
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
      const name = cleanText(body.name, 130);
      if (!name) return fail("পরীক্ষার নাম লিখুন");
      const ref = await store.collection("exams").add({ name, year: new Date().getFullYear(),
        published: false, createdAt: iso(), createdBy: actor.uid });
      await audit(actor, action, ref.id); return json({ ok: true, examId: ref.id });
    }
    if (action === "exam.publish") {
      needRole(actor, ["principal"]);
      const ref = store.collection("exams").doc(cleanText(body.examId, 150));
      if (!(await ref.get()).exists) return fail("পরীক্ষা পাওয়া যায়নি");
      await ref.update({ published: !!body.published, updatedAt: iso() });
      await audit(actor, action, ref.id); return json({ ok: true });
    }
    if (action === "marks.set") {
      needRole(actor, allowedStaff);
      const student = await studentForMarks(actor, cleanText(body.studentId, 120));
      const examId = cleanText(body.examId, 150), subjectId = cleanText(body.subjectId, 80);
      const exam = await store.collection("exams").doc(examId).get();
      if (!exam.exists) return fail("পরীক্ষা পাওয়া যায়নি");
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
        const subject=getSubjects(student.grade,student.group,student.elective,student.fourthSubject).find(s=>s.id===subjectId);
        if(!subject)return fail(student.name+" এর জন্য বিষয়টি প্রযোজ্য নয়");
        const key=examId+"_"+student.id+"_"+subjectId;
        if(used.has(key))return fail("একই বিষয়ের নম্বর একাধিকবার পাঠানো হয়েছে");
        used.add(key);
        const scores=Object.fromEntries(subject.parts.map(part=>[part.key,parseBanglaNumber(entry.scores?.[part.key])]));
        validateMarkForStudent(student,subjectId,scores);
        batch.set(store.collection("marks").doc(key),{examId,studentId:student.id,subjectId,scores,grade:student.grade,updatedBy:actor.uid,updatedAt:now});
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
      const group = body.group, elective = body.elective, fourthSubject = body.fourthSubject,
        optionalId = body.optionalId;
      const { getSubjects } = await import("../../../lib/academic");
      const subjects = getSubjects(student.grade, group, elective, fourthSubject);
      if (!subjects.some(s => s.id === optionalId)) return fail("চতুর্থ বিষয় সঠিক নয়");
      if (group === "science" && !["biology", elective].includes(optionalId)) return fail("বিজ্ঞান বিভাগের চতুর্থ বিষয়টি সঠিক নয়");
      if (group !== "science" && optionalId !== (group === "business" ? elective : fourthSubject)) return fail("চতুর্থ বিষয়টি নির্বাচন করুন");
      await store.collection("students").doc(student.id).update({ group, elective, fourthSubject, optionalId });
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