import { test } from "node:test";
import assert from "node:assert/strict";
import { installPrerequisites, classifyFirebaseFailure, checkFirebaseProjectIds } from "../lib/install-utils.js";

test("first-time setup only requires Firebase service and web configuration", () => {
  const env = {
    FIREBASE_PROJECT_ID: "school-example",
    FIREBASE_CLIENT_EMAIL: "svc@school-example.iam.gserviceaccount.com",
    FIREBASE_PRIVATE_KEY: "pem",
    NEXT_PUBLIC_FIREBASE_API_KEY: "web",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "school-example.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "school-example",
    NEXT_PUBLIC_FIREBASE_APP_ID: "1:example"
  };
  assert.deepEqual(installPrerequisites(env), []);
  delete env.FIREBASE_PRIVATE_KEY;
  assert.deepEqual(installPrerequisites(env), ["FIREBASE_PRIVATE_KEY"]);
});

test("diagnostic error codes map safely without exposing service key", () => {
  assert.equal(classifyFirebaseFailure({ code: 5, message: "The database (default) does not exist" }).code, "firestore-database-missing");
  assert.equal(classifyFirebaseFailure({ code: 7, message: "PERMISSION_DENIED" }).code, "service-account-permission");
  assert.equal(classifyFirebaseFailure({ code: "app/invalid-credential", message: "Failed to parse private key" }).code, "invalid-service-account");
  assert.equal(classifyFirebaseFailure({ code: "unknown" }).code, "firestore-connection-failed");
});
test("mismatched project names detected", () => {
  assert.equal(checkFirebaseProjectIds({ FIREBASE_PROJECT_ID:"a", NEXT_PUBLIC_FIREBASE_PROJECT_ID:"b" }).code,"project-id-mismatch");
  assert.equal(checkFirebaseProjectIds({ FIREBASE_PROJECT_ID:"a", NEXT_PUBLIC_FIREBASE_PROJECT_ID:"a" }),null);
});
