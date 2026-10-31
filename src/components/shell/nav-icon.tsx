import type { NavItemId } from "./nav-items";

const glyphs: Record<NavItemId, string> = {
  dashboard: "◱",
  entries: "☰",
  categories: "⌗",
  savings: "◎",
  models: "≣",
  forecaster: "⤳",
  household: "⚭",
};

type NavIconProps = {
  id: NavItemId;
};

export default function NavIcon({ id }: NavIconProps) {
  return <span aria-hidden="true">{glyphs[id]}</span>;
}
