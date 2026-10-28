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

/** Public-safe diagnostics for initial principal creation; never return raw Firebase errors. */
export function classifyInstallActionFailure(error, stage) {
  const code = String(error?.code ?? "").toLowerCase();
  const message = String(error?.message ?? "").toLowerCase();
  if (code === "auth/email-already-exists" || /email_exists/.test(message))
    return { code: "auth-email-already-exists", hint: "এই ইমেইলে Firebase Authentication-এ আগে থেকেই অ্যাকাউন্ট রয়েছে। Firebase Console → Authentication → Users-এ যাচাই করুন। প্রয়োজন হলে ভিন্ন ইমেইল দিন।" };
  if (code === "auth/invalid-password" || code === "auth/weak-password")
    return { code: "auth-invalid-password", hint: "আরও শক্তিশালী পাসওয়ার্ড দিন (অন্তত ১২ অক্ষর)।" };
  if (code === "auth/invalid-email")
    return { code: "auth-invalid-email", hint: "সঠিক ইমেইল ঠিকানা দিন।" };
  if (/identitytoolkit.*(disabled|not.*enabled)|api.*(not.*enabled|has not been used)|auth\/configuration-not-found|auth\/operation-not-allowed|config.*not.*found/.test(code+" "+message))
    return { code: "firebase-auth-not-configured", hint: "Firebase Console → Authentication → Sign-in method-এ Email/Password চালু করুন এবং Google Cloud-এ Identity Toolkit API enabled আছে কি না যাচাই করুন।" };
  if (/permission.denied|insufficient.permission|auth\/insufficient-permission|auth\/insufficient-privilege|permission_denied/.test(code+" "+message))
    return { code: "firebase-auth-permission-denied", hint: "Service Account-এ Firebase Authentication পরিচালনার অনুমতি নেই। Firebase project-এর সঠিক Admin SDK service account ও IAM roles যাচাই করুন।" };
  if (/invalid.credential|invalid_grant|invalid.jwt|auth\/invalid-credential/.test(code+" "+message))
    return { code: "firebase-auth-credential-error", hint: "Vercel-এ Firebase Service Account credentials সঠিকভাবে দিন এবং Redeploy করুন।" };
  if (stage === "reserve-install" || stage === "save-principal") {
    const firestore = classifyFirebaseFailure(error);
    if (firestore.code !== "firestore-connection-failed") return firestore;
    return { code: "firestore-write-failed", hint: "Firestore থেকে পড়া যাচ্ছে, কিন্তু তথ্য লেখা যাচ্ছে না। Service Account-এর Cloud Datastore User অনুমতি ও Firestore configuration যাচাই করুন।" };
  }
  if (stage === "check-auth" || stage === "create-firebase-user")
    return { code: "firebase-auth-request-failed", hint: "Firebase Authentication-এ অনুরোধ ব্যর্থ হয়েছে। Firebase Console → Authentication চালু এবং Service Account-এর Firebase Auth permission যাচাই করুন।" };
  return { code: "install-failed", hint: "ইনস্টলেশন সম্পন্ন হয়নি। Firebase Auth ও Firestore configuration যাচাই করুন।" };
}
