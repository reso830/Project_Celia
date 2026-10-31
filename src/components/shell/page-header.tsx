import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  actions?: ReactNode;
};

export default function PageHeader({ title, actions }: PageHeaderProps) {
  // lifted from prototype CSS
  return (
    <header className="mb-[var(--header-margin-bottom)] flex min-h-[var(--header-min-height)] flex-wrap items-center justify-between gap-[var(--space-4)]">
      <h1 className="text-[length:var(--font-size-page-title)] font-semibold tracking-[var(--letter-spacing-title)]">
        {title}
      </h1>
      {actions ? (
        <div className="flex flex-wrap items-center gap-[var(--space-2-5)]">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
