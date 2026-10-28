import { test } from "node:test";
import assert from "node:assert/strict";
import { installPrerequisites } from "../lib/install-utils.js";

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
