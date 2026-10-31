import { DomainError } from "./errors";

declare const hexColor: unique symbol;

export type HexColor = string & { readonly [hexColor]: "HexColor" };

const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

const categoryColors = [
  "#7d8ba8",
  "#7f9b6e",
  "#c2a24a",
  "#6f9aa5",
  "#a98bb0",
  "#a5714f",
  "#c98f9b",
  "#5f8a7d",
  "#8a8f6e",
] as const;

export const DEFAULT_CATEGORY_COLORS: readonly HexColor[] = categoryColors.map(
  (color) => color as HexColor,
);

export function parseHexColor(raw: string): HexColor {
  if (!hexColorPattern.test(raw)) {
    throw new DomainError(
      "validation",
      "Enter a six-digit hex colour.",
      "color",
    );
  }

  return raw.toLowerCase() as HexColor;
}

export function defaultCategoryColor(index: number): HexColor {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError(
      "Category colour index must be a non-negative integer.",
    );
  }

  return DEFAULT_CATEGORY_COLORS[index % DEFAULT_CATEGORY_COLORS.length];
}
