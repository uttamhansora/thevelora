import { assertPaise } from "@/lib/money";

export type CouponDraft = {
  discountType: "percentage" | "fixed";
  discountValueBps?: number;
  discountValuePaise?: number;
  minimumOrderValuePaise: number;
  maximumDiscountPaise: number | null;
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  usageLimit: number | null;
  usageCount: number;
};

export type ShippingRules = {
  flatRatePaise: number;
  freeShippingThresholdPaise: number;
  serviceablePinPrefixes: string[];
  blockedPinPrefixes: string[];
};

export type TaxRules = {
  rateBps: number;
  pricesIncludeTax: boolean;
};

export type PriceLine = {
  unitPricePaise: number;
  quantity: number;
};

export type PriceBreakdown = {
  subtotalPaise: number;
  discountPaise: number;
  shippingCostPaise: number;
  taxPaise: number;
  totalPaise: number;
};

export function lineTotal(line: PriceLine): number {
  const unit = assertPaise(line.unitPricePaise, "unit price");
  if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10) {
    throw new Error("Quantity must be between 1 and 10.");
  }
  return assertPaise(unit * line.quantity, "line total");
}

export function sumLines(lines: PriceLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

export function couponIsCurrentlyValid(coupon: CouponDraft, now: Date): string | null {
  if (!coupon.isActive) return "This coupon is not active.";
  if (coupon.startsAt && coupon.startsAt.getTime() > now.getTime()) return "This coupon is not active yet.";
  if (coupon.expiresAt && coupon.expiresAt.getTime() < now.getTime()) return "This coupon has expired.";
  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) return "This coupon has reached its usage limit.";
  return null;
}

export function calculateDiscount(subtotalPaise: number, coupon: CouponDraft | null, now = new Date()): number {
  const subtotal = assertPaise(subtotalPaise, "subtotal");
  if (!coupon) return 0;
  const invalid = couponIsCurrentlyValid(coupon, now);
  if (invalid) return 0;
  if (subtotal < coupon.minimumOrderValuePaise) return 0;

  let discount = 0;
  if (coupon.discountType === "percentage") {
    const bps = coupon.discountValueBps ?? 0;
    if (!Number.isInteger(bps) || bps < 1 || bps > 10000) return 0;
    discount = Math.floor((subtotal * bps) / 10000);
  } else {
    discount = coupon.discountValuePaise ?? 0;
    if (!Number.isInteger(discount) || discount < 0) return 0;
  }
  if (coupon.maximumDiscountPaise != null) {
    discount = Math.min(discount, coupon.maximumDiscountPaise);
  }
  return Math.min(discount, subtotal);
}

export function calculateShipping(subtotalAfterDiscountPaise: number, rules: ShippingRules): number {
  const base = assertPaise(subtotalAfterDiscountPaise, "discounted subtotal");
  const flat = assertPaise(rules.flatRatePaise, "shipping");
  const threshold = assertPaise(rules.freeShippingThresholdPaise, "free shipping threshold");
  if (threshold > 0 && base >= threshold) return 0;
  return flat;
}

export function calculateTax(taxablePaise: number, rules: TaxRules): { taxPaise: number; addedPaise: number } {
  const taxable = assertPaise(taxablePaise, "taxable amount");
  if (!Number.isInteger(rules.rateBps) || rules.rateBps < 0 || rules.rateBps > 10000) {
    throw new Error("Tax rate is invalid.");
  }
  if (rules.rateBps === 0) return { taxPaise: 0, addedPaise: 0 };
  if (rules.pricesIncludeTax) {
    return { taxPaise: Math.floor((taxable * rules.rateBps) / (10000 + rules.rateBps)), addedPaise: 0 };
  }
  const taxPaise = Math.floor((taxable * rules.rateBps) / 10000);
  return { taxPaise, addedPaise: taxPaise };
}

export function quoteTotals(input: {
  lines: PriceLine[];
  coupon: CouponDraft | null;
  shipping: ShippingRules;
  tax: TaxRules;
  now?: Date;
}): PriceBreakdown {
  const subtotalPaise = sumLines(input.lines);
  const discountPaise = calculateDiscount(subtotalPaise, input.coupon, input.now);
  const taxable = subtotalPaise - discountPaise;
  const shippingCostPaise = calculateShipping(taxable, input.shipping);
  const tax = calculateTax(taxable, input.tax);
  const totalPaise = taxable + shippingCostPaise + tax.addedPaise;
  return { subtotalPaise, discountPaise, shippingCostPaise, taxPaise: tax.taxPaise, totalPaise };
}

export type PinCheck = { ok: boolean; message: string };

export function checkPinServiceability(pin: string, rules: ShippingRules): PinCheck {
  if (!/^[1-9]\d{5}$/.test(pin)) {
    return { ok: false, message: "Enter a valid 6-digit PIN code." };
  }
  if (rules.blockedPinPrefixes.some((prefix) => prefix && pin.startsWith(prefix))) {
    return { ok: false, message: "Delivery is not available for this PIN code under the current store rules." };
  }
  if (
    rules.serviceablePinPrefixes.length > 0 &&
    !rules.serviceablePinPrefixes.some((prefix) => prefix && pin.startsWith(prefix))
  ) {
    return { ok: false, message: "This PIN code is outside the delivery area configured by the store." };
  }
  return {
    ok: true,
    message: "This PIN code matches the store's delivery rules. A format match does not guarantee courier serviceability.",
  };
}
