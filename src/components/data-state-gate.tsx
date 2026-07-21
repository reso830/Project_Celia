"use client";

import type { ReactNode } from "react";
import { useData } from "@/data";

export function DataStateGate({ children }: { children: ReactNode }) {
  const state = useData();

  if (state.status === "loading") {
    return <p>Loading your data…</p>;
  }

  if (state.status === "error") {
    return <p role="alert">Unable to load your data. Please try again.</p>;
  }

  return children;
}
