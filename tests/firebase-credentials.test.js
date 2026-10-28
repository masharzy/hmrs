import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeServiceAccountPrivateKey } from "../lib/firebase-credentials.js";

const pem = "-----BEGIN PRIVATE KEY-----\nkey-material\n-----END PRIVATE KEY-----";
test("service account private key supports literal newlines", () => {
 assert.equal(normalizeServiceAccountPrivateKey(pem), pem);
});
test("service account private key supports JSON-escaped newlines", () => {
 assert.equal(normalizeServiceAccountPrivateKey(pem.replace(/\n/g, "\\n")), pem);
});
test("service account private key supports quoted JSON literal", () => {
 assert.equal(normalizeServiceAccountPrivateKey(JSON.stringify(pem)), pem);
});
test("service account private key supports accidental surrounding quotes", () => {
 assert.equal(normalizeServiceAccountPrivateKey('"'+pem+'"'), pem);
});
