import { Types } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors";
import { couponIsCurrentlyValid, quoteTotals, checkPinServiceability, type CouponDraft } from "@/lib/pricing";
import { CouponModel } from "@/models/coupon";
import { ProductModel } from "@/models/product";
import { effectiveUnitPrice, sellableStock, toPublicProduct, type ProductRecord, type VariantRecord } from "@/services/catalog";
import { getStoreSettings } from "@/services/settings";

export async function quoteCart(input: {
  items: { productId: string; variantSku?: string | null; quantity: number }[];
  couponCode?: string;
  pinCode?: string;
}) {
  await connectDB();
  const settings = await getStoreSettings();
  if (input.pinCode) {
    const pin = checkPinServiceability(input.pinCode, settings.shipping);
    if (!pin.ok) throw new AppError(pin.message, 400);
  }
  const ids = input.items.map((item) => item.productId).filter((id) => Types.ObjectId.isValid(id));
  const products = await ProductModel.find({ _id: { $in: ids } }).lean<ProductRecord[]>();
  const byId = new Map(products.map((product) => [String(product._id), product]));
  const lines: { unitPricePaise: number; quantity: number }[] = [];
  const resolved = [];

  for (const requested of input.items) {
    const product = byId.get(requested.productId);
    if (!product || !product.isPublished || product.isArchived) {
      resolved.push({ productId: requested.productId, available: false, message: "This product is unavailable." });
      continue;
    }
    const variant = requested.variantSku ? product.variants.find((item) => item.sku === requested.variantSku) ?? null : null;
    if (product.variants.length > 0 && !variant) {
      resolved.push({ productId: requested.productId, available: false, message: "Select an available variant." });
      continue;
    }
    const chosen = variant as VariantRecord | null;
    const stock = sellableStock(product, chosen);
    const quantity = Math.min(requested.quantity, stock, 10);
    const unitPricePaise = effectiveUnitPrice(product, chosen);
    if (quantity < 1) {
      resolved.push({ ...toPublicProduct(product), variantSku: chosen?.sku ?? null, available: false, quantity: 0, unitPricePaise, lineTotalPaise: 0, message: "Out of stock." });
      continue;
    }
    lines.push({ unitPricePaise, quantity });
    resolved.push({
      ...toPublicProduct(product),
      variantSku: chosen?.sku ?? null,
      variantName: chosen?.name ?? "",
      available: true,
      quantity,
      unitPricePaise,
      lineTotalPaise: unitPricePaise * quantity,
      message: quantity < requested.quantity ? "Quantity was reduced to the available stock." : "",
    });
  }

  let coupon: CouponDraft | null = null;
  let couponMessage = "";
  if (input.couponCode) {
    const found = await CouponModel.findOne({ code: input.couponCode.toUpperCase() });
    if (!found) couponMessage = "Coupon code is not valid.";
    else {
      coupon = {
        discountType: found.discountType,
        discountValueBps: found.discountValueBps,
        discountValuePaise: found.discountValuePaise,
        minimumOrderValuePaise: found.minimumOrderValuePaise,
        maximumDiscountPaise: found.maximumDiscountPaise,
        isActive: found.isActive,
        startsAt: found.startsAt,
        expiresAt: found.expiresAt,
        usageLimit: found.usageLimit,
        usageCount: found.usageCount,
      };
      couponMessage = couponIsCurrentlyValid(coupon, new Date()) ?? "";
      if (couponMessage) coupon = null;
    }
  }

  const totals = quoteTotals({ lines, coupon, shipping: settings.shipping, tax: settings.tax });
  const pin = input.pinCode ? checkPinServiceability(input.pinCode, settings.shipping) : null;
  return { items: resolved, totals, couponMessage, pin, currency: "INR" as const };
}
