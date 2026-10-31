"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type MutationError = { code: string; message: string; field?: string };

export function useMutation() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run(
    url: string,
    method: string,
    body?: Record<string, string>,
  ) {
    setPending(true);
    try {
      const response = await fetch(url, {
        method,
        ...(body
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          : {}),
      });

      if (response.ok) {
        router.refresh();
        return undefined;
      }

      try {
        const payload = (await response.json()) as { error?: MutationError };
        return (
          payload.error ?? {
            code: "internal",
            message: "Unable to save changes. Please try again.",
          }
        );
      } catch {
        return {
          code: "internal",
          message: "Unable to save changes. Please try again.",
        };
      }
    } catch {
      return {
        code: "internal",
        message: "Unable to save changes. Please try again.",
      };
    } finally {
      setPending(false);
    }
  }

  return { run, pending };
}
