import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyContent } from "../src/saves.js";

describe("classifyContent", () => {
  it("classifies direct URL on first line as link", () => {
    const r = classifyContent("https://example.com/path?q=1\nnote");
    assert.equal(r.kind, "link");
    assert.equal(r.content, "https://example.com/path?q=1");
  });

  it("finds URL anywhere in text", () => {
    const r = classifyContent("see https://a.org/x for more");
    assert.equal(r.kind, "link");
    assert.equal(r.content, "https://a.org/x");
  });

  it("treats plain text as note", () => {
    const r = classifyContent("hello world");
    assert.equal(r.kind, "note");
    assert.equal(r.content, "hello world");
  });

  it("returns empty note for whitespace", () => {
    const r = classifyContent("   \n\t  ");
    assert.equal(r.kind, "note");
    assert.equal(r.content, "");
  });
});
