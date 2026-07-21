import type { BucketColor } from "@/domain/bucket-color";
import { CELIA_STORES } from "./celia-database";
import {
  type DatabaseOpener,
  IndexedDbRepository,
} from "./indexed-db-repository";
import type { BucketColorRepository } from "./bucket-color-repository";

export class IndexedDbBucketColorRepository
  extends IndexedDbRepository<BucketColor>
  implements BucketColorRepository
{
  constructor(databaseOpener?: DatabaseOpener) {
    super(CELIA_STORES.bucketColorOverrides, databaseOpener);
  }
}
