import { describe, expect, it } from "vitest";
import {
  expenseBucketColorKey,
  formatHexColor,
  formatRgbColor,
  parseHexColor,
  parseRgbColor,
} from "@/domain/color";

describe("color helpers", () => {
  it("normalizes valid hex colors", () => {
    expect(formatHexColor(parseHexColor("#24A6E9")!)).toBe("#24a6e9");
    expect(formatRgbColor(parseHexColor("#24A6E9")!)).toEqual({
      red: "36",
      green: "166",
      blue: "233",
    });
  });

  it("rejects malformed hex and invalid RGB channel values", () => {
    expect(parseHexColor("24a6e9")).toBeUndefined();
    expect(parseHexColor("#24a6e")).toBeUndefined();
    expect(parseRgbColor("256", "0", "0")).toBeUndefined();
    expect(parseRgbColor("0", "-1", "0")).toBeUndefined();
    expect(parseRgbColor("", "0", "0")).toBeUndefined();
  });

  it("formats valid RGB values as lowercase hex", () => {
    expect(formatHexColor(parseRgbColor("36", "166", "233")!)).toBe(
      "#24a6e9",
    );
  });

  it("keys overrides by normalized expense bucket name", () => {
    expect(expenseBucketColorKey(" Housing ")).toBe("expense:housing");
  });
});
