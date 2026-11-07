import { describe, expect, it } from "vitest";
import { validateEntryDate } from "@/domain/entry";

describe("entry dates", () => {
  it.each(["2026-09-19", "2028-01-01", "2024-02-29"])("accepts %s", (date) =>
    expect(validateEntryDate(date)).toBe(true),
  );
  it.each(["2026-02-29", "2026-13-01", "2026-09-31", "not-a-date", ""])(
    "rejects %s",
    (date) => expect(validateEntryDate(date)).toBe(false),
  );
});
