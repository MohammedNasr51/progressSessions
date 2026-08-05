import test from "node:test";
import assert from "node:assert/strict";
import { cleanSession, isValidMonth, validateSession } from "../src/validation.js";

const validSession = { id: "session-1", number: 1, title: "Fractions", date: "2026-08-05", note: "Good progress", status: "great" };

test("validates month keys", () => {
  assert.equal(isValidMonth("2026-08"), true);
  assert.equal(isValidMonth("2026-13"), false);
  assert.equal(isValidMonth("August"), false);
});

test("accepts and cleans a valid session", () => {
  assert.deepEqual(validateSession(validSession), []);
  assert.equal(cleanSession({ ...validSession, title: "  Fractions  " }).title, "Fractions");
});

test("rejects invalid session fields", () => {
  const errors = validateSession({ ...validSession, number: 0, status: "bad", date: "05/08/2026" });
  assert.equal(errors.length, 3);
});
