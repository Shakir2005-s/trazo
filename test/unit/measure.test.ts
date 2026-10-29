// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

import { describe, expect, it } from "vitest";
import { lineHeight, textWidth, wrapText } from "../../src/text/measure.js";

describe("textWidth", () => {
  it("adds the advance of each character", () => {
    // Inter at 2048 units per em: "a" = 1150, "M" = 1850.
    expect(textWidth("a", 2048, 400)).toBe(1150);
    expect(textWidth("aM", 2048, 400)).toBe(3000);
  });

  it("scales with the font size", () => {
    expect(textWidth("a", 1024, 400)).toBe(575);
  });

  it("uses the semibold advances for weight 600", () => {
    expect(textWidth("M", 14, 600)).toBeGreaterThan(textWidth("M", 14, 400));
  });

  it("measures accented Latin-1 letters like their base letter", () => {
    expect(textWidth("á", 14, 400)).toBe(textWidth("a", 14, 400));
  });

  it("gives wide characters outside the embedded range a full em", () => {
    expect(textWidth("数据", 10, 400)).toBe(20);
  });

  it("measures the empty string as zero", () => {
    expect(textWidth("", 14, 400)).toBe(0);
  });
});

describe("wrapText", () => {
  it("keeps a short label on one line", () => {
    expect(wrapText("Orders API", 200, 14, 400)).toEqual(["Orders API"]);
  });

  it("breaks between words to fit the width", () => {
    const lines = wrapText("Payment authorization service gateway", 120, 14, 400);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(textWidth(line, 14, 400)).toBeLessThanOrEqual(120);
    expect(lines.join(" ")).toBe("Payment authorization service gateway");
  });

  it("splits a single word that is wider than the line", () => {
    const lines = wrapText("supercalifragilisticexpialidocious", 80, 14, 400);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(textWidth(line, 14, 400)).toBeLessThanOrEqual(80);
    expect(lines.join("")).toBe("supercalifragilisticexpialidocious");
  });

  it("keeps explicit line breaks", () => {
    expect(wrapText("Orders\nAPI", 200, 14, 400)).toEqual(["Orders", "API"]);
  });

  it("collapses repeated spaces", () => {
    expect(wrapText("a   b", 200, 14, 400)).toEqual(["a b"]);
  });
});

describe("lineHeight", () => {
  it("is proportional to the font size", () => {
    expect(lineHeight(10) * 2).toBe(lineHeight(20));
  });
});
