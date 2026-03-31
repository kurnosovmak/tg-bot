import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSlidingWindowLimiter } from "../src/rateLimit.js";

describe("createSlidingWindowLimiter", () => {
  it("allows up to max events in window", () => {
    const allow = createSlidingWindowLimiter({ windowMs: 10_000, max: 3 });
    assert.equal(allow(1), true);
    assert.equal(allow(1), true);
    assert.equal(allow(1), true);
    assert.equal(allow(1), false);
  });

  it("tracks keys independently", () => {
    const allow = createSlidingWindowLimiter({ windowMs: 10_000, max: 1 });
    assert.equal(allow("a"), true);
    assert.equal(allow("a"), false);
    assert.equal(allow("b"), true);
  });
});
