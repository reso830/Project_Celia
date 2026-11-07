"use client";

import { useEffect, useRef } from "react";

export default function Toast({
  message,
  kind = "success",
  onDismiss,
}: {
  message: string | null;
  kind?: "success" | "error";
  onDismiss: () => void;
}) {
  const toastRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, 2200);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);
  useEffect(() => {
    const toast = toastRef.current;
    if (!toast || !message) return;
    toast.showPopover?.();
    return () => toast.hidePopover?.();
  }, [message]);
  if (!message) return null;
  return (
    <div
      ref={toastRef}
      popover="manual"
      role={kind === "error" ? "alert" : "status"}
      className="fixed top-auto bottom-[26px] left-1/2 -translate-x-1/2 rounded-celia-control border border-celia-ink bg-celia-ink px-[18px] py-[11px] text-[13px] text-celia-surface"
    >
      {message}
    </div>
  );
}
