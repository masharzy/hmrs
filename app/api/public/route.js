import { db } from "../../../lib/firebase-admin";
import { json } from "../../../lib/server-auth";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const [notices, settings] = await Promise.all([
      db().collection("notices").orderBy("createdAt", "desc").limit(20).get(),
      db().collection("settings").doc("school").get()
    ]);
    return json({ notices: notices.docs.map(d => ({ id: d.id, ...d.data() })).filter(n => n.published),
      settings: settings.exists ? settings.data() : {} });
  } catch {
    return json({ notices: [], settings: {}, setupRequired: true });
  }
}