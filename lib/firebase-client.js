"use client";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

export function firebaseAuth() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  };
  if (!config.apiKey || !config.projectId || !config.appId) throw Error("Firebase Web configuration is missing");
  return getAuth(getApps().length ? getApp() : initializeApp(config));
}

export function studentEmail(grade, section, roll) {
  const normalized = String(section).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!normalized || !/^[6-9]|10$/.test(String(grade)) || !/^[0-9]+$/.test(String(roll))) throw Error("শ্রেণি, শাখা ও রোল যাচাই করুন");
  return "s" + grade + "-" + normalized + "-" + Number(roll) + "@students.hmrs.school";
}
export function staffEmail(username) {
  if (!/^[a-z0-9._-]{3,40}$/i.test(username)) throw Error("ইউজার আইডি সঠিক নয়");
  return username.toLowerCase() + "@staff.hmrs.school";
}