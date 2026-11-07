import { describe, expect, it } from "vitest";
import { formatCentavos, parseAndValidateAmount } from "@/domain/amount";

describe("amounts", () => {
  it.each([
    ["100", 10000],
    ["3240.50", 324050],
    ["1,000,000", 100000000],
    ["0.05", 5],
  ])("parses %s exactly", (raw, centavos) => {
    expect(parseAndValidateAmount(raw)).toEqual({ ok: true, centavos });
  });
  it.each([
    ["", "Enter an amount above zero."],
    ["0", "Enter an amount above zero."],
    ["0.00", "Enter an amount above zero."],
    ["-5", "Amount must be a positive number with at most two decimal places."],
    [
      "abc",
      "Amount must be a positive number with at most two decimal places.",
    ],
    [
      "10.999",
      "Amount must be a positive number with at most two decimal places.",
    ],
    [
      "1,00",
      "Amount must be a positive number with at most two decimal places.",
    ],
    [
      "1,0,0",
      "Amount must be a positive number with at most two decimal places.",
    ],
    [
      "9999999999999",
      "Amount exceeds maximum allowed limit (₱999,999,999.99).",
    ],
  ])(
    "rejects invalid input %s with the user-facing message",
    (raw, message) => {
      const result = parseAndValidateAmount(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe(message);
    },
  );
  it("formats grouped signed pesos without losing centavos", () => {
    expect(formatCentavos(-324050, { signed: true })).toBe("−₱3,240.50");
  });
  it("formats whole pesos, forced decimals, and positive signs", () => {
    expect(formatCentavos(10000)).toBe("₱100");
    expect(formatCentavos(10000, { forceDecimals: true, signed: true })).toBe(
      "+₱100.00",
    );
  });
});
