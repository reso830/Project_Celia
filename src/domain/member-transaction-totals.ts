import type { Member } from "./member";
import type { Transaction } from "./transaction";

export interface MemberTransactionTotal {
  memberId: string;
  name: string;
  income: number;
  expense: number;
}

export function calculateMemberTransactionTotals(
  members: readonly Member[],
  transactions: readonly Transaction[],
): readonly MemberTransactionTotal[] {
  const membersById = new Map(members.map((member) => [member.id, member]));
  const totals = new Map<string, MemberTransactionTotal>();

  for (const transaction of transactions) {
    const member = membersById.get(transaction.memberId);

    if (!member) {
      continue;
    }

    const current = totals.get(member.id) ?? {
      memberId: member.id,
      name: member.name,
      income: 0,
      expense: 0,
    };
    current[transaction.type] += transaction.amount;
    totals.set(member.id, current);
  }

  return [...totals.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}
