"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon from "./nav-icon";
import { navItems } from "./nav-items";

export default function AppRail() {
  const pathname = usePathname();

  // lifted from prototype CSS
  return (
    <nav
      aria-label="Main navigation"
      className="flex w-[var(--rail-width)] shrink-0 flex-col items-center gap-[var(--rail-item-gap)] border-r border-celia-rail-border bg-celia-rail py-[var(--rail-padding-y)]"
    >
      <div className="mb-[var(--rail-logo-margin-bottom)] grid size-[var(--rail-logo-size)] place-items-center rounded-celia-control bg-celia-accent text-[length:var(--font-size-brand)] font-bold text-celia-surface">
        C
      </div>
      {navItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
            className={`grid h-[var(--rail-item-height)] w-[var(--rail-item-width)] place-items-center rounded-celia-nav-item text-[length:var(--font-size-nav-icon)] transition-colors hover:bg-celia-nav-hover ${
              isActive
                ? "bg-celia-surface text-celia-accent"
                : "text-celia-nav-inactive"
            }`}
            href={item.href}
            key={item.id}
            title={item.label}
          >
            <NavIcon id={item.id} />
          </Link>
        );
      })}
    </nav>
  );
}
