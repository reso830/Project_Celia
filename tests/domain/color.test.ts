import { describe, expect, it } from "vitest";
import { DomainError } from "@/domain/errors";
import { defaultCategoryColor, parseHexColor } from "@/domain/color";

describe("category colours", () => {
  it("normalizes valid hex colours to lowercase", () => {
    expect(parseHexColor("#7D8BA8")).toBe("#7d8ba8");
  });

  it.each(["7d8ba8", "#abc", "#7d8ba800", "#nothex", " #7d8ba8 "])(
    "rejects %j as an invalid hex colour",
    (value) => {
      expect(() => parseHexColor(value)).toThrow(DomainError);

      try {
        parseHexColor(value);
      } catch (error) {
        expect(error).toMatchObject({ code: "validation" });
      }
    },
  );

  it("cycles category colours after the ninth identity colour", () => {
    expect(defaultCategoryColor(0)).toBe("#7d8ba8");
    expect(defaultCategoryColor(8)).toBe("#8a8f6e");
    expect(defaultCategoryColor(9)).toBe("#7d8ba8");
  });

  it.each([-1, 1.5])("rejects a non-count palette index of %s", (index) => {
    expect(() => defaultCategoryColor(index)).toThrow(RangeError);
  });
});
