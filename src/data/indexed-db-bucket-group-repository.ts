import type { BucketGroup } from "@/domain/bucket-group";
import { CELIA_STORES } from "./celia-database";
import {
  type DatabaseOpener,
  IndexedDbRepository,
} from "./indexed-db-repository";
import type { BucketGroupRepository } from "./bucket-group-repository";

export class IndexedDbBucketGroupRepository
  extends IndexedDbRepository<BucketGroup>
  implements BucketGroupRepository
{
  constructor(databaseOpener?: DatabaseOpener) {
    super(CELIA_STORES.bucketGroups, databaseOpener);
  }
}
