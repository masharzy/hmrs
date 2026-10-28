export function installPrerequisites(env) {
  const required = [
    "FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY",
    "NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_APP_ID"
  ];
  return required.filter(key => !env[key]);
}

export function classifyFirebaseFailure(error) {
  const code = String(error?.code ?? "").toLowerCase();
  const message = String(error?.message ?? "").toLowerCase();
  if (/private.key|pem|signing.key|invalid.credential|invalid_grant|credential.*invalid/.test(message) ||
      /invalid-credential/.test(code))
    return { code: "invalid-service-account", hint: "Firebase Service Account JSON-এর client_email ও private_key হুবহু Vercel-এ দিন। private_key-তে BEGIN/END PRIVATE KEY অংশ থাকতে হবে।" };
  if (code === "5" || /not.found/.test(code) || /database.*(not.exist|does.not.exist|not.found)|cloud.firestore.*not.enabled|firestore.*(not.enabled|not.found)/.test(message))
    return { code: "firestore-database-missing", hint: "Firebase Console → Firestore Database → Create database দিয়ে (default) database তৈরি করুন।" };
  if (code === "7" || /permission.denied/.test(code) || /permission.denied|insufficient.permission|serviceusage.services.use/.test(message))
    return { code: "service-account-permission", hint: "Firebase Service Account-এর Cloud Firestore access (Cloud Datastore User role) এবং Firestore API enabled কিনা যাচাই করুন।" };
  if (code === "16" || /unauthenticated/.test(code) || /invalid.jwt|jwt.*expired/.test(message))
    return { code: "service-account-authentication", hint: "Service Account key valid কিনা যাচাই করে নতুন key দিয়ে Redeploy করুন।" };
  if (code === "4" || /deadline.exceeded|timeout|econnrefused|unavailable/.test(message))
    return { code: "firestore-unreachable", hint: "Firestore API ও project connectivity যাচাই করুন; প্রয়োজনে আবার চেষ্টা করুন।" };
  return { code: "firestore-connection-failed", hint: "Firebase project ID, Service Account এবং Firestore Database configuration যাচাই করুন।" };
}

export function checkFirebaseProjectIds(env) {
  if (env.FIREBASE_PROJECT_ID && env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      env.FIREBASE_PROJECT_ID.trim() !== env.NEXT_PUBLIC_FIREBASE_PROJECT_ID.trim())
    return { code: "project-id-mismatch", hint: "FIREBASE_PROJECT_ID এবং NEXT_PUBLIC_FIREBASE_PROJECT_ID একই Firebase project-এর হতে হবে।" };
  return null;
}
