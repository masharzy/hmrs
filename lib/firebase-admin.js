import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function adminApp() {
  if (getApps().length) return getApps()[0];
  const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: privateKey } = process.env;
  if (!projectId || !clientEmail || !privateKey) throw Error("Firebase Admin credentials are not configured");
  return initializeApp({ credential: cert({
    projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n")
  }) });
}

export const adminAuth = () => getAuth(adminApp());
export const db = () => getFirestore(adminApp());