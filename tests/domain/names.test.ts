import { describe, expect, it } from "vitest";
import { DomainError } from "@/domain/errors";
import { nameKey, validateName } from "@/domain/names";

describe("names", () => {
  it("rejects empty and whitespace-only names with a validation error", () => {
    for (const value of ["", "   ", "\t\n"]) {
      expect(() => validateName(value)).toThrow(DomainError);

      try {
        validateName(value);
      } catch (error) {
        expect(error).toMatchObject({ code: "validation" });
      }
    }
  });

  it("trims surrounding whitespace from valid names", () => {
    expect(validateName("  Ana  ")).toBe("Ana");
  });

  it("derives case-insensitive keys without changing inner spaces", () => {
    expect(nameKey("  Ana  ")).toBe(nameKey("ana"));
    expect(nameKey("  Ana   Maria  ")).toBe("ana   maria");
  });
});
