import { describe, expect, it } from "vitest";
import {
  formatAcceptLanguage,
  parseAcceptLanguage,
  pickAcceptedLanguage
} from "../src/index.js";

describe("parseAcceptLanguage", () => {
  it("parses and sorts weighted language ranges", () => {
    const result = parseAcceptLanguage("fr-CA, fr;q=0.8, en-US;q=0.6");

    expect(result.ok).toBe(true);
    expect(result.languages).toMatchObject([
      { range: "fr-CA", quality: 1, order: 0, subtags: ["fr", "CA"] },
      { range: "fr", quality: 0.8, order: 1, subtags: ["fr"] },
      { range: "en-US", quality: 0.6, order: 2, subtags: ["en", "US"] }
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it("keeps source order when requested", () => {
    const result = parseAcceptLanguage("en;q=0.4, fr;q=1", { sort: false });

    expect(result.languages.map((language) => language.range)).toEqual(["en", "fr"]);
  });

  it("returns diagnostics for empty and non-string input", () => {
    expect(parseAcceptLanguage("").diagnostics).toMatchObject([{ code: "empty-header" }]);
    expect(parseAcceptLanguage(null).diagnostics).toMatchObject([{ code: "invalid-input" }]);
  });

  it("rejects malformed ranges and q parameters by default", () => {
    const result = parseAcceptLanguage("fr;q=1.2, bad_tag, en;q=0.5;q=0.3, de;q=0.3333");

    expect(result.ok).toBe(false);
    expect(result.languages).toEqual([]);
    expect(result.diagnostics.map((entry) => entry.code)).toEqual([
      "invalid-quality",
      "invalid-language-range",
      "duplicate-quality",
      "quality-precision-exceeded"
    ]);
  });

  it("can accept extended q precision for tolerant import tools", () => {
    const result = parseAcceptLanguage("de;q=0.3333", { allowExtendedQualityPrecision: true });

    expect(result.ok).toBe(true);
    expect(result.languages[0]?.quality).toBe(0.3333);
  });

  it("can keep invalid ranges for UI diagnostics", () => {
    const result = parseAcceptLanguage("fr;q=1.2, en", { keepInvalid: true });

    expect(result.ok).toBe(false);
    expect(result.languages.map((language) => language.range)).toEqual(["fr", "en"]);
  });

  it("supports wildcard diagnostics and optional rejection", () => {
    expect(parseAcceptLanguage("*;q=0.5").diagnostics).toMatchObject([
      { code: "wildcard-range", token: "*" }
    ]);

    const rejected = parseAcceptLanguage("*", { allowWildcard: false });
    expect(rejected.ok).toBe(false);
    expect(rejected.languages).toEqual([]);
  });
});

describe("formatAcceptLanguage", () => {
  it("formats parsed ranges with compact q values", () => {
    const parsed = parseAcceptLanguage("fr-CA, en;q=0.333");

    expect(formatAcceptLanguage(parsed.languages, { precision: 2 })).toBe("fr-CA, en;q=0.33");
    expect(formatAcceptLanguage(parsed.languages, { includeQualityOne: true })).toBe(
      "fr-CA;q=1, en;q=0.333"
    );
  });
});

describe("pickAcceptedLanguage", () => {
  it("picks exact and base language matches", () => {
    expect(pickAcceptedLanguage("fr-CA, en;q=0.8", ["en-US", "fr-FR"])).toBe("fr-FR");
    expect(pickAcceptedLanguage("de, en-GB;q=0.8", ["en-US", "fr-FR"])).toBe("en-US");
  });

  it("ignores q=0 and malformed headers", () => {
    expect(pickAcceptedLanguage("fr;q=0, en;q=0.5", ["fr-FR", "en-US"])).toBe("en-US");
    expect(pickAcceptedLanguage("fr;q=oops", ["fr-FR"])).toBeUndefined();
    expect(pickAcceptedLanguage("*", ["", "de-DE"])).toBe("de-DE");
  });
});
