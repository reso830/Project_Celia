import { DomainValidationError } from "./errors";

/** A color customisation for a category bucket group. */
export interface BucketColor {
  bucket: string;
  color: string;
}

export function createBucketColor(input: BucketColor): Readonly<BucketColor> {
  if (!input.bucket.trim() || !input.color.trim()) {
    throw new DomainValidationError("Bucket name and color are required.");
  }

  return Object.freeze({ ...input });
}
