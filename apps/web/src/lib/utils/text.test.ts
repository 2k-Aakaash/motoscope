import { describe, expect, it } from "vitest";
import {
  containsPattern,
  isHttpUrl,
  isPlainText,
  isValidSlug,
  MAX_SEARCH_TERMS,
  searchTerms,
  slugify,
} from "./text";

describe("slugify (ported from Slug.From)", () => {
  it.each([
    ["Arka Trailhawk 400", "arka-trailhawk-400"],
    ["  Kestrel   Moto  ", "kestrel-moto"],
    ["Strix 390 (2025)", "strix-390-2025"],
    ["Café Racer — Édition", "cafe-racer-edition"],
    ["Bolt-S//Pro", "bolt-s-pro"],
    ["!!!", ""],
  ])("%s → %s", (input, expected) => expect(slugify(input)).toBe(expected));

  it("truncates without a trailing hyphen", () => expect(slugify("abcd efgh", 5)).toBe("abcd"));
});

describe("isValidSlug", () => {
  it.each([
    ["arka-sprint-125", true],
    ["Arka-Sprint", false],
    ["double--hyphen", false],
    ["-leading", false],
    ["", false],
    [null, false],
  ])("%s → %s", (slug, expected) => expect(isValidSlug(slug)).toBe(expected));
});

describe("search text", () => {
  it.each([
    ["strix", "%strix%"],
    [" 100% ", "%100\\%%"],
    ["a_b", "%a\\_b%"],
    ["c:\\path", "%c:\\\\path%"],
  ])("escapes LIKE wildcards in %s", (term, expected) => expect(containsPattern(term)).toBe(expected));

  it("splits, de-duplicates case-insensitively and caps terms", () => {
    expect(searchTerms("  kestrel   strix KESTREL ")).toEqual(["kestrel", "strix"]);
    expect(searchTerms("a b c d e f g")).toHaveLength(MAX_SEARCH_TERMS);
    expect(searchTerms("   ")).toEqual([]);
    expect(searchTerms(null)).toEqual([]);
  });
});

describe("input guards", () => {
  it("accepts newlines and tabs but rejects other control characters", () => {
    expect(isPlainText("Line one\nLine\ttwo")).toBe(true);
    expect(isPlainText("Bell\u0007")).toBe(false);
    expect(isPlainText("C1\u0085")).toBe(false);
  });

  it("accepts only absolute http(s) URLs", () => {
    expect(isHttpUrl("https://example.com/x")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("/relative")).toBe(false);
    expect(isHttpUrl("ftp://example.com")).toBe(false);
  });
});
