import { db } from "../../../lib/firebase-admin";
import { json } from "../../../lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // A failed notices query must not hide an otherwise available hero photo.
    const [noticeResult, settingsResult, routinesResult] = await Promise.allSettled([
      db().collection("notices").orderBy("createdAt", "desc").limit(20).get(),
      db().collection("settings").doc("school").get(),
      db().collection("routines").orderBy("updatedAt", "desc").limit(30).get()
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
    return json({ notices, settings, routines, ...(settingsResult.status === "rejected" ? { setupRequired: true } : {}) });
  } catch {
    return json({ notices: [], settings: {}, routines: [], setupRequired: true });
  }
}
