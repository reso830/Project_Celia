import Link from "next/link";

export type AppPage = "dashboard" | "settings";

interface AppHeaderProps {
  activePage: AppPage;
}

const navigationItemClassName =
  "rounded-md px-3 py-2 text-[#c3ccd6] hover:bg-[#1a2c4d]";

export function AppHeader({ activePage }: AppHeaderProps) {
  return (
    <header className="rounded-xl bg-[#12213d] px-5 py-4 text-[#f3f4f6] sm:flex sm:items-center sm:justify-between">
      <p className="text-lg font-semibold">Celia</p>
      <nav
        aria-label="Primary navigation"
        className="mt-3 flex flex-wrap gap-2 text-sm font-semibold sm:mt-0"
      >
        {activePage === "dashboard" ? (
          <span
            aria-current="page"
            className="rounded-md bg-white px-3 py-2 text-[#12213d]"
          >
            Dashboard
          </span>
        ) : (
          <Link className={navigationItemClassName} href="/">
            Dashboard
          </Link>
        )}
        <span className={navigationItemClassName}>Transactions</span>
        {activePage === "settings" ? (
          <span
            aria-current="page"
            className="rounded-md bg-white px-3 py-2 text-[#12213d]"
          >
            Settings
          </span>
        ) : (
          <Link className={navigationItemClassName} href="/settings">
            Settings
          </Link>
        )}
      </nav>
    </header>
  );
}
