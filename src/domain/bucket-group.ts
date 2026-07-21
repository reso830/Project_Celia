import { isCategoryType, type CategoryType } from "./category-type";
import { DomainValidationError } from "./errors";

export interface BucketGroup {
  id: string;
  type: CategoryType;
  name: string;
}

export function createBucketGroup(input: BucketGroup): Readonly<BucketGroup> {
  const name = input.name.trim();

  if (!input.id.trim() || !name) {
    throw new DomainValidationError("Bucket group id and name are required.");
  }

  if (!isCategoryType(input.type)) {
    throw new DomainValidationError(
      "Bucket group type must be income or expense.",
    );
  }

  return Object.freeze({ ...input, name });
}
