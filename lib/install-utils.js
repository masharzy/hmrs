import { createHash, timingSafeEqual } from "node:crypto";

/** Compare secrets without leaking prefix information. Never log or expose the key. */
export function correctInstallKey(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string" || expected.length < 32) return false;
  const hash = value => createHash("sha256").update(value, "utf8").digest();
  return timingSafeEqual(hash(provided), hash(expected));
}

export function installPrerequisites(env) {
  const required = [
    "FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY",
    "NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_APP_ID"
  ];
  return required.filter(key => !env[key]);
}