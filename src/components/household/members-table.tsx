import type { Member } from "@/domain/member";
import AddMember from "./add-member";
import MemberRow from "./member-row";

export default function MembersTable({
  members,
  adding,
  onAddCancel,
  onRemove,
}: {
  members: Member[];
  adding: boolean;
  onAddCancel: () => void;
  onRemove: (member: Member) => void;
}) {
  // lifted from prototype CSS
  return (
    <section className="overflow-hidden rounded-celia-card border border-celia-border bg-celia-surface">
      <div className="grid [grid-template-columns:var(--household-member-columns)] gap-[var(--space-3)] border-b border-celia-border bg-celia-surface-subtle px-[var(--space-4-5)] py-[var(--space-3)] text-[length:var(--font-size-caps)] font-medium tracking-[.06em] text-celia-muted">
        <span>
          {members.length} {members.length === 1 ? "member" : "members"}
        </span>
        <span>INCOME VS. OUTGOING</span>
        <span>KEEPS</span>
        <span />
      </div>
      {adding ? <AddMember onCancel={onAddCancel} /> : null}
      {members.map((member) => (
        <MemberRow key={member.id} member={member} onRemove={onRemove} />
      ))}
    </section>
  );
}
