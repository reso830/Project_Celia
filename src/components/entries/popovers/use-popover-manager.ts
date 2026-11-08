"use client";

import { useEffect, useState } from "react";

export type FormMenu = "date" | "cat" | "item" | null;

export function usePopoverManager() {
  const [formMenu, setFormMenu] = useState<FormMenu>(null);
  useEffect(() => {
    if (!formMenu) return;
    const closeOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest("[data-entry-popover]")) {
        setFormMenu(null);
      }
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, [formMenu]);

  return {
    formMenu,
    toggle(menu: Exclude<FormMenu, null>) {
      setFormMenu((current) => (current === menu ? null : menu));
    },
    close() {
      setFormMenu(null);
    },
  };
}
