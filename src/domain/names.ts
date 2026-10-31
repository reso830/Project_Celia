import { DomainError } from "./errors";

export function validateName(raw: string): string {
  const name = raw.trim();

  if (!name) {
    throw new DomainError("validation", "Name is required.", "name");
  }

  return name;
}

export function nameKey(name: string): string {
  return name.trim().toLocaleLowerCase("en-US");
}
