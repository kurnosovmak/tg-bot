import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { maxSaveContentLength, validateSaveText } from "../src/limits.js";

describe("validateSaveText", () => {
  it("rejects empty", () => {
    const r = validateSaveText("   ", 100);
    assert.equal(r.ok, false);
    assert.equal(r.reason, "empty");
  });

  it("rejects too long", () => {
    const r = validateSaveText("a".repeat(10), 5);
    assert.equal(r.ok, false);
    assert.equal(r.reason, "too_long");
  });

  it("accepts within limit", () => {
    const r = validateSaveText("hello", 100);
    assert.equal(r.ok, true);
  });
});

describe("maxSaveContentLength", () => {
  it("defaults when unset", () => {
    assert.equal(maxSaveContentLength({}), 4096);
  });

  it("respects env", () => {
    assert.equal(maxSaveContentLength({ MAX_SAVE_CONTENT_LENGTH: "2000" }), 2000);
  });
});
