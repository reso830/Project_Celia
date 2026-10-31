export type Umbrella = "income" | "expense" | "savings";

export type ClassifiableUmbrella = Exclude<Umbrella, "savings">;

export function isClassifiableUmbrella(
  umbrella: string,
): umbrella is ClassifiableUmbrella {
  return umbrella === "income" || umbrella === "expense";
}
