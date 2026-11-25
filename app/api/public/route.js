import { db } from "../../../lib/firebase-admin";
import { json } from "../../../lib/server-auth";
import { publicTeachers } from "../../../lib/public-staff.js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // A failed notices query must not hide an otherwise available hero photo.
    const [noticeResult, settingsResult, routinesResult, teachersResult] = await Promise.allSettled([
      db().collection("notices").orderBy("createdAt", "desc").limit(100).get(),
      db().collection("settings").doc("school").get(),
      db().collection("routines").orderBy("updatedAt", "desc").limit(30).get(),
      db().collection("users").where("role", "in", ["teacher", "class_teacher"]).limit(150).get()
    ]);
    const notices = noticeResult.status === "fulfilled"
      ? noticeResult.value.docs.map(d => ({ id: d.id, ...d.data() })).filter(n => n.published)
      : [];
    const settings = settingsResult.status === "fulfilled" && settingsResult.value.exists
      ? settingsResult.value.data()
      : {};
    const routines = routinesResult.status === "fulfilled"
      ? routinesResult.value.docs.map(d=>({id:d.id,...d.data()}))
          .filter(r=>r.published===true)
          .map(({id,title,kind,grade,group,imageUrl,updatedAt})=>({id,title,kind,grade,group,imageUrl,updatedAt}))
      : [];
    const teachers = teachersResult.status === "fulfilled"
      ? publicTeachers(teachersResult.value.docs.map(d => d.data()))
      : [];
    return json({ notices, settings, routines, teachers, ...(settingsResult.status === "rejected" ? { setupRequired: true } : {}) });
  } catch {
    return json({ notices: [], settings: {}, routines: [], teachers: [], setupRequired: true });
  }
}
