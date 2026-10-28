import { test } from "node:test";
import assert from "node:assert/strict";
import { correctInstallKey, installPrerequisites } from "../lib/install-utils.js";

test("installer demands at least 32-character configured secret", () => {
  assert.equal(correctInstallKey("x".repeat(32), "x".repeat(32)), true);
  assert.equal(correctInstallKey("x".repeat(31), "x".repeat(31)), false);
  assert.equal(correctInstallKey("x".repeat(32), "y".repeat(32)), false);
  assert.equal(correctInstallKey(undefined, "x".repeat(32)), false);
});
test("installer checks both server and browser Firebase keys", () => {
  const vars = {
    FIREBASE_PROJECT_ID:"example", FIREBASE_CLIENT_EMAIL:"svc@example.com", FIREBASE_PRIVATE_KEY:"pem",
    NEXT_PUBLIC_FIREBASE_API_KEY:"web",NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:"x.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:"example",NEXT_PUBLIC_FIREBASE_APP_ID:"1:abc"
  };
  assert.deepEqual(installPrerequisites(vars), []);
  delete vars.FIREBASE_CLIENT_EMAIL;
  assert.deepEqual(installPrerequisites(vars), ["FIREBASE_CLIENT_EMAIL"]);
});
