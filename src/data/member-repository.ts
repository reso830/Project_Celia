import type { Member } from "@/domain/member";

export interface MemberRepository {
  get(id: string): Promise<Member | undefined>;
  list(): Promise<readonly Member[]>;
  save(member: Member): Promise<void>;
  delete(id: string): Promise<void>;
}
