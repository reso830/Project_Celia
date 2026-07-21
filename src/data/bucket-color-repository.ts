import type { BucketColor } from "@/domain/bucket-color";

/** Bucket colors are keyed by the bucket group name. */
export interface BucketColorRepository {
  get(bucket: string): Promise<BucketColor | undefined>;
  list(): Promise<readonly BucketColor[]>;
  save(bucketColor: BucketColor): Promise<void>;
  delete(bucket: string): Promise<void>;
}
