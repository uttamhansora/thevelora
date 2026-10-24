export function assertPaise(value: number, label = "amount"): number {
  if (!Number.isInteger(value) || value < 0 || value > 10_000_000_000) {
    throw new Error(`${label} must be a non-negative integer paise amount.`);
  }
  return value;
}

export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees) || rupees < 0) {
    throw new Error("Rupee amount must be a non-negative finite number.");
  }
  return Math.round(rupees * 100);
}

export function paiseToInrString(paise: number): string {
  const value = assertPaise(paise);
  const rupees = Math.floor(value / 100);
  const fraction = value % 100;
  return `${rupees}.${String(fraction).padStart(2, "0")}`;
}

export function formatInr(paise: number): string {
  const value = assertPaise(paise);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value / 100);
}

export function discountPercent(pricePaise: number, compareAtPricePaise: number | null | undefined): number | null {
  if (compareAtPricePaise == null) return null;
  if (!Number.isInteger(compareAtPricePaise) || compareAtPricePaise <= pricePaise || pricePaise < 0) return null;
  return Math.round(((compareAtPricePaise - pricePaise) * 100) / compareAtPricePaise);
}
