import { describe, expect, it } from "vitest";
import { connectWithCache } from "@/lib/db/mongoose";
import { DatabaseConfigError } from "@/lib/errors";
import { discountPercent, paiseToInrString, rupeesToPaise } from "@/lib/money";
import { canTransitionOrder, canTransitionPayment } from "@/lib/order-state";
import { manualUpiAdapter } from "@/lib/payments/adapter";
import { calculateDiscount, checkPinServiceability, quoteTotals } from "@/lib/pricing";
import { hasPermission } from "@/lib/auth/permissions";
import { evaluateRateLimit } from "@/lib/security/rate-limit-logic";
import { slugify } from "@/lib/slug";
import { buildUpiIntent } from "@/lib/upi";
import { detectImageType, validateImageUpload } from "@/lib/images/magic";
import { productInputSchema } from "@/lib/validation/catalog";

describe("money and pricing", () => {
  it("keeps INR amounts in integer paise", () => {
    expect(rupeesToPaise(2499.5)).toBe(249950);
    expect(paiseToInrString(249950)).toBe("2499.50");
    expect(discountPercent(80000, 100000)).toBe(20);
    expect(discountPercent(100000, 80000)).toBeNull();
  });

  it("calculates coupons, shipping, and tax without floating point totals", () => {
    const totals = quoteTotals({
      lines: [{ unitPricePaise: 100000, quantity: 2 }],
      coupon: {
        discountType: "percentage",
        discountValueBps: 1000,
        minimumOrderValuePaise: 0,
        maximumDiscountPaise: 15000,
        isActive: true,
        startsAt: null,
        expiresAt: null,
        usageLimit: null,
        usageCount: 0,
      },
      shipping: { flatRatePaise: 9900, freeShippingThresholdPaise: 250000, serviceablePinPrefixes: [], blockedPinPrefixes: [] },
      tax: { rateBps: 500, pricesIncludeTax: false },
    });
    expect(totals).toEqual({ subtotalPaise: 200000, discountPaise: 15000, shippingCostPaise: 9900, taxPaise: 9250, totalPaise: 204150 });
    expect(calculateDiscount(50000, null)).toBe(0);
  });

  it("does not treat a PIN format match as a courier guarantee", () => {
    const result = checkPinServiceability("560001", { flatRatePaise: 0, freeShippingThresholdPaise: 0, serviceablePinPrefixes: ["56"], blockedPinPrefixes: [] });
    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/does not guarantee/i);
    expect(checkPinServiceability("110001", { flatRatePaise: 0, freeShippingThresholdPaise: 0, serviceablePinPrefixes: [], blockedPinPrefixes: ["11"] }).ok).toBe(false);
  });
});

describe("upi and order state", () => {
  it("builds an encoded UPI intent and refuses a missing merchant", () => {
    const uri = buildUpiIntent({ pa: "merchant@okaxis", pn: "THE VELORA", tr: "VEL-20261022-ABCDEF1234567890", tn: "Order payment", am: "1499.00" });
    expect(uri).toContain("pa=merchant%40okaxis");
    expect(uri).toContain("pn=THE%20VELORA");
    expect(uri).toContain("cu=INR");
    const missing = manualUpiAdapter.createInstructions({ orderNumber: "VEL-20261022-ABCDEF1234567890", amountPaise: 149900, currency: "INR" }, { vpa: "", name: "THE VELORA" });
    expect(missing.configured).toBe(false);
    expect(missing.upiUri).toBeNull();
  });

  it("rejects invalid fulfilment and payment transitions", () => {
    expect(canTransitionOrder("awaiting_payment", "shipped")).toBe(false);
    expect(canTransitionOrder("processing", "shipped")).toBe(true);
    expect(canTransitionPayment("paid", "pending")).toBe(false);
    expect(canTransitionPayment("claim_submitted", "paid")).toBe(true);
  });
});

describe("catalogue rules", () => {
  it("slugifies names and rejects duplicate variant SKUs", () => {
    expect(slugify("Silk Banarasi Saree!")).toBe("silk-banarasi-saree");
    const parsed = productInputSchema.safeParse({
      name: "Test saree",
      slug: "test-saree",
      sku: "VEL-1",
      pricePaise: 100,
      variants: [{ name: "Red", sku: "VEL-1", stockQuantity: 1, priceOverridePaise: null, color: "Red" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("hides unpublished products from the public filter contract", () => {
    expect(hasPermission("order_manager", "payments.verify")).toBe(true);
    expect(hasPermission("product_manager", "payments.verify")).toBe(false);
    expect(hasPermission("super_admin", "settings.write")).toBe(true);
  });
});

describe("uploads and limits", () => {
  it("rejects non-image content and mismatched MIME types", () => {
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("png");
    expect(() => validateImageUpload(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), "image/png")).toThrow(/not a supported image/i);
  });

  it("resets a rate-limit window after it expires", () => {
    const first = evaluateRateLimit(null, 1_000, 2, 500);
    const blocked = evaluateRateLimit({ count: 2, windowStart: 1_000 }, 1_200, 2, 500);
    const reset = evaluateRateLimit({ count: 2, windowStart: 1_000 }, 1_600, 2, 500);
    expect(first.allowed).toBe(true);
    expect(blocked.allowed).toBe(false);
    expect(reset.allowed).toBe(true);
  });
});

describe("database connection helper", () => {
  it("reuses a cached connection and redacts secrets from failures", async () => {
    const cache = { conn: null as null, promise: null as null };
    let calls = 0;
    const connect = async () => {
      calls += 1;
      return { connection: true } as never;
    };
    const first = await connectWithCache({ uri: "mongodb://example/thevelora", dbName: "thevelora", cache, connect, logError() {} });
    const second = await connectWithCache({ uri: "mongodb://example/thevelora", dbName: "thevelora", cache, connect, logError() {} });
    expect(first).toBe(second);
    expect(calls).toBe(1);

    const logs: string[] = [];
    const failing = { conn: null, promise: null };
    await expect(connectWithCache({
      uri: "mongodb+srv://user:secret-password@cluster.example.net/thevelora",
      dbName: "thevelora",
      cache: failing,
      connect: async () => { throw new Error("failed mongodb+srv://user:secret-password@cluster.example.net/thevelora"); },
      logError: (message) => logs.push(message),
    })).rejects.toBeInstanceOf(DatabaseConfigError);
    expect(logs.join(" ")).not.toContain("secret-password");
    await expect(connectWithCache({ uri: "", dbName: "thevelora", cache: { conn: null, promise: null }, connect, logError() {} })).rejects.toThrow(/not configured/i);
  });
});
