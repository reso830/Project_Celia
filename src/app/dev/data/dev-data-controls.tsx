"use client";

import { useState } from "react";
import { clearCeliaData, replaceWithDummyData } from "@/data/dummy-data";

type Operation = "populate" | "clear";

export interface DevDataControlsProps {
  referenceDate?: string;
  populate?: (referenceDate: string) => Promise<void>;
  clear?: () => Promise<void>;
}

function currentIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DevDataControls({
  referenceDate = currentIsoDate(),
  populate = (date) => replaceWithDummyData({ referenceDate: date }),
  clear = clearCeliaData,
}: DevDataControlsProps) {
  const [pendingOperation, setPendingOperation] = useState<Operation>();
  const [runningOperation, setRunningOperation] = useState<Operation>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  async function confirm(operation: Operation): Promise<void> {
    setRunningOperation(operation);
    setError(undefined);
    setMessage(undefined);

    try {
      if (operation === "populate") {
        await populate(referenceDate);
        setMessage("Dummy data populated.");
      } else {
        await clear();
        setMessage("Local data cleared.");
      }
      setPendingOperation(undefined);
    } catch {
      setError(
        operation === "populate"
          ? "Unable to populate dummy data."
          : "Unable to clear local data.",
      );
    } finally {
      setRunningOperation(undefined);
    }
  }

  const isRunning = runningOperation !== undefined;
  const confirmationCopy =
    pendingOperation === "populate"
      ? "Replace all local Celia records with dummy data?"
      : "Clear all local Celia records?";

  return (
    <section className="rounded-xl border border-[#d6dae1] bg-white p-5">
      <h1 className="text-xl font-semibold text-[#16213f]">
        Development data tools
      </h1>
      <p className="mt-2 text-sm text-[#6b7686]">
        These actions affect only this browser&apos;s local Celia database.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="rounded-md bg-[#2463eb] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={isRunning}
          onClick={() => {
            setPendingOperation("populate");
            setMessage(undefined);
            setError(undefined);
          }}
          type="button"
        >
          Populate dummy data
        </button>
        <button
          className="rounded-md border border-[#b42318] px-4 py-2 text-sm font-semibold text-[#b42318] disabled:opacity-60"
          disabled={isRunning}
          onClick={() => {
            setPendingOperation("clear");
            setMessage(undefined);
            setError(undefined);
          }}
          type="button"
        >
          Clear local data
        </button>
      </div>
      {pendingOperation ? (
        <div className="mt-4 rounded-md bg-[#fff4e5] p-4 text-sm text-[#7a3e00]">
          <p>{confirmationCopy}</p>
          <div className="mt-3 flex gap-3">
            <button
              className="rounded-md bg-[#16213f] px-3 py-2 font-semibold text-white disabled:opacity-60"
              disabled={isRunning}
              onClick={() => void confirm(pendingOperation)}
              type="button"
            >
              {pendingOperation === "populate"
                ? "Confirm populate"
                : "Confirm clear"}
            </button>
            <button
              className="rounded-md border border-[#b7bfca] px-3 py-2 font-semibold text-[#16213f]"
              disabled={isRunning}
              onClick={() => setPendingOperation(undefined)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {message ? (
        <p className="mt-4 text-sm text-[#067647]">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-[#b42318]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
