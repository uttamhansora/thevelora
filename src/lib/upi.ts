const VPA_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}@[a-zA-Z][a-zA-Z]{1,63}$/;

export function isValidVpa(value: string): boolean {
  return VPA_PATTERN.test(value.trim());
}

export type UpiIntentInput = {
  pa: string;
  pn: string;
  tr: string;
  tn: string;
  am: string;
};

function encodeParam(value: string): string {
  return encodeURIComponent(value);
}

export function buildUpiIntent(input: UpiIntentInput): string {
  const pa = input.pa.trim();
  const pn = input.pn.trim();
  const tr = input.tr.trim();
  const tn = input.tn.trim();
  const am = input.am.trim();
  if (!isValidVpa(pa)) throw new Error("Merchant UPI ID is invalid.");
  if (!pn || pn.length > 80) throw new Error("Merchant name is required.");
  if (!/^[A-Za-z0-9-]{6,40}$/.test(tr)) throw new Error("Transaction reference is invalid.");
  if (!tn || tn.length > 80) throw new Error("Transaction note is required.");
  if (!/^\d+\.\d{2}$/.test(am) || am === "0.00") throw new Error("UPI amount must be a positive INR value with two decimals.");

  return `upi://pay?pa=${encodeParam(pa)}&pn=${encodeParam(pn)}&tr=${encodeParam(tr)}&tn=${encodeParam(tn)}&am=${encodeParam(am)}&cu=INR`;
}
