import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedRequestOrigin } from "../lib/origin.js";

const base = { requestUrl:"https://hmrshs.vercel.app/api/install", configuredOrigin:"hmrs-psi.vercel.app" };

test("same-origin install works with scheme-less APP_ORIGIN", () => {
 assert.equal(isAllowedRequestOrigin({ ...base, origin:"https://hmrshs.vercel.app" }),true);
});
test("canonical origin also works with bare hostname", () => {
 assert.equal(isAllowedRequestOrigin({ ...base, origin:"https://hmrs-psi.vercel.app" }),true);
});
test("broken APP_ORIGIN never crashes same-origin install", () => {
 assert.equal(isAllowedRequestOrigin({ ...base, configuredOrigin:"https://", origin:"https://hmrshs.vercel.app" }),true);
});
test("foreign origin blocked with and without configured canonical URL", () => {
 assert.equal(isAllowedRequestOrigin({ ...base, origin:"https://attacker.example" }),false);
 assert.equal(isAllowedRequestOrigin({ ...base, configuredOrigin:"https://", origin:"https://attacker.example" }),false);
});
test("malformed origins cannot pass", () => {
 assert.equal(isAllowedRequestOrigin({ ...base, origin:"null" }),false);
 assert.equal(isAllowedRequestOrigin({ ...base, origin:"not-a-url" }),false);
});
test("localhost origin on local development", () => {
 assert.equal(isAllowedRequestOrigin({requestUrl:"http://localhost:3000/api/install",origin:"http://localhost:3000",configuredOrigin:"http://localhost:3000"}),true);
});
