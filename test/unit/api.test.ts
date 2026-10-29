// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

import { describe, expect, it } from "vitest";
import { check, make } from "../../src/index.js";

const valid = {
  type: "architecture",
  title: "Tiny",
  theme: "light",
  nodes: [{ id: "a" }, { id: "b" }],
  edges: ["a -> b"],
};

describe("check", () => {
  it("accepts a parsed value", () => {
    expect(check(valid)).toEqual({ ok: true, issues: [] });
  });

  it("accepts JSON text", () => {
    expect(check(JSON.stringify(valid))).toEqual({ ok: true, issues: [] });
  });

  it("reports the position of a JSON syntax error", () => {
    const result = check('{"type": }');
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.code).toBe("json/syntax");
  });

  it("reports schema errors", () => {
    const result = check({ ...valid, nodes: [] });
    expect(result.ok).toBe(false);
    expect(result.issues.every((i) => i.severity === "error")).toBe(true);
  });

  it("keeps warnings on an ok result", () => {
    const result = check({ ...valid, edges: ["a -> b", "a -> b"] });
    expect(result.ok).toBe(true);
    expect(result.issues.map((i) => i.code)).toEqual(["edge/duplicate"]);
  });
});

describe("make", () => {
  it("renders html from a parsed value", async () => {
    const result = await make(valid);
    expect(result.ok).toBe(true);
    expect(result.html?.startsWith("<!doctype html>")).toBe(true);
    expect(result.html).toContain('data-theme="light"');
  });

  it("overrides the diagram theme", async () => {
    const result = await make(JSON.stringify(valid), { theme: "dark" });
    expect(result.html).toContain('data-theme="dark"');
  });

  it("stops at the first failing stage and returns no html", async () => {
    const result = await make("{");
    expect(result.ok).toBe(false);
    expect("html" in result).toBe(false);
    expect(result.issues[0]?.code).toBe("json/syntax");

    const invalid = await make({ ...valid, edges: ["a -> zz"] });
    expect(invalid.ok).toBe(false);
    expect(invalid.html).toBeUndefined();
  });

  it("returns warnings next to the html", async () => {
    const result = await make({ ...valid, edges: ["a -> b", "a -> b"] });
    expect(result.ok).toBe(true);
    expect(result.html).toBeDefined();
    expect(result.issues.map((i) => i.code)).toEqual(["edge/duplicate"]);
  });
});
