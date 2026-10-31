import type { HexColor } from "./color";
import type { ClassifiableUmbrella } from "./umbrella";

export type Category = {
  id: string;
  umbrella: ClassifiableUmbrella;
  name: string;
  color: HexColor;
  archivedAt: string | null;
  mergedIntoCategoryId: string | null;
};
