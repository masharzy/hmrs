import { test } from "node:test";
import assert from "node:assert/strict";
import { createApplicationEditToken, hashApplicationEditToken, verifyApplicationEditToken, canApplicantEdit } from "../lib/admission-edit.js";

test("new applications get unique strong edit tokens; only hashes are stored", () => {
 const first=createApplicationEditToken(),second=createApplicationEditToken();
 assert.match(first.token,/^[A-Za-z0-9_-]{43}$/);
 assert.match(first.tokenHash,/^[0-9a-f]{64}$/);
 assert.notEqual(first.token,second.token);
 assert.notEqual(first.tokenHash,second.tokenHash);
 assert.equal(first.tokenHash,hashApplicationEditToken(first.token));
 assert.notEqual(first.token,first.tokenHash);
});
test("applicant edit token verification rejects wrong and malformed secrets", () => {
 const {token,tokenHash}=createApplicationEditToken();
 const other=createApplicationEditToken();
 assert.equal(verifyApplicationEditToken(token,tokenHash),true);
 for(const value of [other.token,token.slice(1),"",null,"a".repeat(43)]){
  assert.equal(verifyApplicationEditToken(value,tokenHash),false);
 }
 for(const stored of [null,undefined,"",token, "f".repeat(64)])
  assert.equal(verifyApplicationEditToken(token,stored),false);
});
test("only pending, secret-backed applications are eligible for self-editing", () => {
 const {tokenHash}=createApplicationEditToken();
 assert.equal(canApplicantEdit({status:"pending",editTokenHash:tokenHash}),true);
 for(const status of ["approved","rejected","student_deleted",""])assert.equal(canApplicantEdit({status,editTokenHash:tokenHash}),false);
 assert.equal(canApplicantEdit({status:"pending"}),false); // old applications need principal assistance
});
