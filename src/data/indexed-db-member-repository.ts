import type { Member } from "@/domain/member";
import { CELIA_STORES } from "./celia-database";
import {
  type DatabaseOpener,
  IndexedDbRepository,
} from "./indexed-db-repository";
import type { MemberRepository } from "./member-repository";

export class IndexedDbMemberRepository
  extends IndexedDbRepository<Member>
  implements MemberRepository
{
  constructor(databaseOpener?: DatabaseOpener) {
    super(CELIA_STORES.members, databaseOpener);
  }
}
