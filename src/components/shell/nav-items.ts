export type NavItemId =
  | "dashboard"
  | "entries"
  | "categories"
  | "savings"
  | "models"
  | "forecaster"
  | "household";

export type NavItem = {
  id: NavItemId;
  label: string;
  href: string;
};

export const navItems: readonly NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/" },
  { id: "entries", label: "Entries", href: "/entries" },
  { id: "categories", label: "Categories", href: "/categories" },
  { id: "savings", label: "Savings buckets", href: "/savings" },
  { id: "models", label: "Budget models", href: "/models" },
  { id: "forecaster", label: "Forecaster", href: "/forecaster" },
  { id: "household", label: "Household", href: "/household" },
];
