export type Centavos = number;

export const MAX_AMOUNT_CENTAVOS = 99_999_999_999;

export function parseAndValidateAmount(
  raw: string,
):
  | { ok: true; centavos: Centavos }
  | { ok: false; error: string; field: "amount" } {
  const trimmed = raw.trim();
  if (!trimmed)
    return { ok: false, error: "Enter an amount above zero.", field: "amount" };
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(trimmed))
    return {
      ok: false,
      error:
        "Amount must be a positive number with at most two decimal places.",
      field: "amount",
    };
  const value = trimmed.replace(/,/g, "");
  const [pesos, cents = ""] = value.split(".");
  const centavos =
    Number.parseInt(pesos, 10) * 100 +
    Number.parseInt(cents.padEnd(2, "0"), 10);
  if (centavos <= 0)
    return { ok: false, error: "Enter an amount above zero.", field: "amount" };
  if (centavos > MAX_AMOUNT_CENTAVOS)
    return {
      ok: false,
      error: "Amount exceeds maximum allowed limit (₱999,999,999.99).",
      field: "amount",
    };
  return { ok: true, centavos };
}

export function formatCentavos(
  centavos: number,
  options?: { signed?: boolean; prefix?: string; forceDecimals?: boolean },
): string {
  const negative = centavos < 0;
  const absolute = Math.abs(centavos);
  const pesos = Math.floor(absolute / 100).toLocaleString("en-US");
  const cents = absolute % 100;
  const decimals =
    cents || options?.forceDecimals ? `.${String(cents).padStart(2, "0")}` : "";
  const sign = options?.signed ? (negative ? "−" : "+") : "";
  return `${sign}${options?.prefix ?? "₱"}${pesos}${decimals}`;
}

export function parseAndValidateNonNegativeAmount(
  raw: string,
  field = "amount",
):
  | { ok: true; centavos: Centavos }
  | { ok: false; error: string; field: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, centavos: 0 };
  }
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(trimmed)) {
    return {
      ok: false,
      error:
        "Amount must be a non-negative number with at most two decimal places.",
      field,
    };
  }
  const value = trimmed.replace(/,/g, "");
  const [pesos, cents = ""] = value.split(".");
  const centavos =
    Number.parseInt(pesos, 10) * 100 +
    Number.parseInt(cents.padEnd(2, "0"), 10);
  if (centavos > MAX_AMOUNT_CENTAVOS) {
    return {
      ok: false,
      error: "Amount exceeds maximum allowed limit (₱999,999,999.99).",
      field,
    };
  }
  return { ok: true, centavos };
}

export function parseOptionalPositiveAmount(
  raw: string | undefined | null,
  field = "targetAmount",
):
  | { ok: true; centavos: Centavos | null }
  | { ok: false; error: string; field: string } {
  if (!(raw ?? "").trim()) return { ok: true, centavos: null };
  const parsed = parseAndValidateAmount(raw!.trim());
  return parsed.ok ? parsed : { ...parsed, field };
}
