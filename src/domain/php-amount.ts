export function parsePhpAmount(value: string): number | undefined {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    return undefined;
  }

  const [pesos, centavos = ""] = value.split(".");
  const amount = Number(pesos) * 100 + Number(centavos.padEnd(2, "0"));

  return Number.isSafeInteger(amount) && amount > 0 ? amount : undefined;
}
