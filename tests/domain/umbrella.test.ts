import { describe, expect, it } from "vitest";
import { isClassifiableUmbrella } from "@/domain/umbrella";

describe("umbrellas", () => {
  it.each(["income", "expense"])("allows %s to hold categories", (umbrella) => {
    expect(isClassifiableUmbrella(umbrella)).toBe(true);
  });

  it.each(["savings", "unknown", "Income"])(
    "does not allow %s to hold categories",
    (umbrella) => {
      expect(isClassifiableUmbrella(umbrella)).toBe(false);
    },
  );
});
