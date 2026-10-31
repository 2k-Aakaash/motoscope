import { describe, expect, it } from "vitest";
import { formatDate, formatInr, formatInrCompact, formatPower, formatSpecValue, kwToPs } from "./format";

describe("formatInr", () => {
  it("uses Indian digit grouping without paise", () => {
    expect(formatInr(92000)).toBe("₹92,000");
    expect(formatInr(310000)).toBe("₹3,10,000");
    expect(formatInr(12345678.9)).toBe("₹1,23,45,679");
  });
});

describe("formatInrCompact", () => {
  it("switches to lakh and crore", () => {
    expect(formatInrCompact(92000)).toBe("₹92,000");
    expect(formatInrCompact(310000)).toBe("₹3.1 lakh");
    expect(formatInrCompact(125000)).toBe("₹1.25 lakh");
    expect(formatInrCompact(25000000)).toBe("₹2.5 crore");
  });
});

describe("power", () => {
  it("converts kW to metric horsepower", () => {
    expect(kwToPs(1)).toBeCloseTo(1.35962, 5);
    expect(formatPower(32)).toBe("32 kW (43.5 PS)");
  });
});

describe("formatSpecValue", () => {
  const value = { number: null, text: null, boolean: null, provenance: "Demo" as const, sourceId: null };

  it("formats numbers with their unit", () => {
    expect(formatSpecValue({ unit: "cc", valueType: "Number" }, { ...value, number: 124.6 })).toBe(
      "124.6 cc",
    );
    expect(formatSpecValue({ unit: "rpm", valueType: "Integer" }, { ...value, number: 9000 })).toBe(
      "9,000 rpm",
    );
    expect(formatSpecValue({ unit: "kW", valueType: "Number" }, { ...value, number: 32 })).toBe(
      "32 kW (43.5 PS)",
    );
    expect(formatSpecValue({ unit: null, valueType: "Integer" }, { ...value, number: 6 })).toBe("6");
  });

  it("formats booleans and text", () => {
    expect(formatSpecValue({ unit: null, valueType: "Boolean" }, { ...value, boolean: false })).toBe("No");
    expect(formatSpecValue({ unit: null, valueType: "Text" }, { ...value, text: "LED" })).toBe("LED");
  });
});

describe("formatDate", () => {
  it("formats UTC timestamps as calendar dates", () => {
    expect(formatDate("2026-10-31T23:30:00Z")).toBe("31 Oct 2026");
  });
});
