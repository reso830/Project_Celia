export type Budget = {
  id: string;
  name: string;
  amountMinor: number;
  currency: string;
  period: "monthly" | "yearly";
};
