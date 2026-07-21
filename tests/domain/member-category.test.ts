import { describe, expect, it } from "vitest";
import {
  DomainValidationError,
  createBucketColor,
  createCategory,
  createMember,
  isCategoryType,
} from "../../src/domain/index.js";

describe("members and categories", () => {
  it("creates a member from the prototype fields", () => {
    expect(
      createMember({ id: "member-alex", name: "Alex", color: "#2463eb" }),
    ).toEqual({
      id: "member-alex",
      name: "Alex",
      color: "#2463eb",
    });
  });

  it("creates an expense sub-category within a bucket group", () => {
    expect(
      createCategory({
        id: "category-rent",
        type: "expense",
        group: "Housing",
        name: "Rent",
      }),
    ).toEqual({
      id: "category-rent",
      type: "expense",
      group: "Housing",
      name: "Rent",
    });
  });

  it("recognizes exactly the income and expense category types", () => {
    expect(isCategoryType("income")).toBe(true);
    expect(isCategoryType("expense")).toBe(true);
    expect(isCategoryType("transfer")).toBe(false);
  });

  it("rejects a category without a bucket group", () => {
    expect(() =>
      createCategory({
        id: "category-rent",
        type: "expense",
        group: " ",
        name: "Rent",
      }),
    ).toThrow(DomainValidationError);
  });

  it("rejects an unrecognized category type with a precise error", () => {
    expect(() =>
      createCategory({
        id: "category-transfer",
        type: "transfer" as never,
        group: "Transfers",
        name: "Account transfer",
      }),
    ).toThrow("Category type must be income or expense.");
  });

  it("creates a bucket color for a named bucket", () => {
    expect(createBucketColor({ bucket: "Housing", color: "#0ea5e9" })).toEqual({
      bucket: "Housing",
      color: "#0ea5e9",
    });
  });

  it("rejects a bucket color without a bucket name or color", () => {
    expect(() => createBucketColor({ bucket: " ", color: "#0ea5e9" })).toThrow(
      DomainValidationError,
    );
    expect(() => createBucketColor({ bucket: "Housing", color: " " })).toThrow(
      DomainValidationError,
    );
  });
});
