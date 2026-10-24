import { Types } from "mongoose";
import QRCode from "qrcode";
import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors";
import { createOrderNumber, createPublicToken } from "@/lib/ids";
import { isDuplicateKeyError } from "@/lib/mongo";
import { canTransitionOrder, canTransitionPayment, type OrderStatus, type PaymentStatus } from "@/lib/order-state";
import { manualUpiAdapter, type PaymentInstructions } from "@/lib/payments/adapter";
import { couponIsCurrentlyValid, quoteTotals, checkPinServiceability, type CouponDraft } from "@/lib/pricing";
import type { CheckoutInput } from "@/lib/validation/catalog";
import { CouponModel } from "@/models/coupon";
import { OrderModel } from "@/models/order";
import { ProductModel } from "@/models/product";
import { CustomerModel, InventoryMovementModel } from "@/models/supporting";
import { effectiveUnitPrice, type ProductRecord, type VariantRecord } from "@/services/catalog";
import { getStoreSettings, resolveMerchant } from "@/services/settings";

type OrderItem = {
  productId: Types.ObjectId;
  name: string;
  slug: string;
  sku: string;
  variantSku: string | null;
  variantName: string;
  imageUrl: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
};

type OrderRecord = {
  _id: Types.ObjectId;
  orderNumber: string;
  publicToken: string;
  idempotencyKey: string;
  customer: { name: string; mobile: string; email: string };
  shippingAddress: { addressLine: string; landmark: string; city: string; state: string; pinCode: string };
  items: OrderItem[];
  subtotalPaise: number;
  discountPaise: number;
  shippingCostPaise: number;
  taxPaise: number;
  totalPaise: number;
  currency: string;
  couponCode: string;
  customerNotes: string;
  paymentMethod: "upi_manual";
  paymentStatus: PaymentStatus;
  paymentReference: string;
  claims: {
    _id?: Types.ObjectId;
    utr: string;
    note: string;
    receiptUrl: string;
    receiptPublicId: string;
    submittedAt: Date;
    decision: string;
    decisionNote: string;
  }[];
  orderStatus: OrderStatus;
  inventoryState: "pending" | "reserved" | "releasing" | "committed" | "released";
  salesCounted: boolean;
  fulfillment: { courier: string; trackingNumber: string; shippedAt: Date | null; deliveredAt: Date | null };
  internalNotes: { body: string; authorId?: Types.ObjectId; createdAt: Date }[];
  audit: { at: Date; actorId?: Types.ObjectId | null; action: string; from: string; to: string; note: string }[];
  createdAt: Date;
};

function couponDraft(doc: {
  discountType: "percentage" | "fixed";
  discountValueBps?: number;
  discountValuePaise?: number;
  minimumOrderValuePaise: number;
  maximumDiscountPaise?: number | null;
  isActive: boolean;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  usageLimit?: number | null;
  usageCount: number;
}): CouponDraft {
  return {
    discountType: doc.discountType,
    discountValueBps: doc.discountValueBps,
    discountValuePaise: doc.discountValuePaise,
    minimumOrderValuePaise: doc.minimumOrderValuePaise,
    maximumDiscountPaise: doc.maximumDiscountPaise ?? null,
    isActive: doc.isActive,
    startsAt: doc.startsAt ?? null,
    expiresAt: doc.expiresAt ?? null,
    usageLimit: doc.usageLimit ?? null,
    usageCount: doc.usageCount,
  };
}

function skuOf(item: OrderItem): string {
  return item.variantSku || item.sku;
}

async function adjustStock(item: OrderItem, delta: number): Promise<boolean> {
  if (item.variantSku) {
    const result = await ProductModel.updateOne(
      { _id: item.productId, "variants.sku": item.variantSku },
      { $inc: { "variants.$.stockQuantity": delta } },
    );
    return result.modifiedCount === 1;
  }
  const result = await ProductModel.updateOne({ _id: item.productId }, { $inc: { stockQuantity: delta } });
  return result.modifiedCount === 1;
}

async function reserveItem(orderId: Types.ObjectId, item: OrderItem): Promise<void> {
  const key = `reserve:${orderId}:${skuOf(item)}`;
  const existing = await InventoryMovementModel.findOne({ idempotencyKey: key });
  if (existing) return;
  const filter = item.variantSku
    ? {
        _id: item.productId,
        isPublished: true,
        isArchived: false,
        variants: { $elemMatch: { sku: item.variantSku, stockQuantity: { $gte: item.quantity } } },
      }
    : {
        _id: item.productId,
        isPublished: true,
        isArchived: false,
        variants: { $size: 0 },
        stockQuantity: { $gte: item.quantity },
      };
  const update = item.variantSku
    ? { $inc: { "variants.$.stockQuantity": -item.quantity } }
    : { $inc: { stockQuantity: -item.quantity } };
  const reserved = await ProductModel.findOneAndUpdate(filter, update);
  if (!reserved) throw new AppError(`${item.name} does not have enough stock.`, 409);
  try {
    await InventoryMovementModel.create({
      productId: item.productId,
      sku: skuOf(item),
      delta: -item.quantity,
      reason: "order_reserve",
      orderId,
      idempotencyKey: key,
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      await adjustStock(item, item.quantity);
      throw error;
    }
  }
}

async function rollbackReservation(order: OrderRecord, reason: string): Promise<void> {
  for (const item of order.items) {
    const reserved = await InventoryMovementModel.findOne({ idempotencyKey: `reserve:${order._id}:${skuOf(item)}` });
    if (!reserved) continue;
    const key = `release:${order._id}:${skuOf(item)}`;
    try {
      await InventoryMovementModel.create({
        productId: item.productId,
        sku: skuOf(item),
        delta: item.quantity,
        reason,
        orderId: order._id,
        idempotencyKey: key,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) continue;
      throw error;
    }
    await adjustStock(item, item.quantity);
  }
}

async function releaseOrderStock(order: OrderRecord, reason: string): Promise<void> {
  const locked = await OrderModel.findOneAndUpdate(
    { _id: order._id, inventoryState: { $in: ["reserved", "committed", "releasing"] } },
    { inventoryState: "releasing" },
  );
  if (!locked && order.inventoryState !== "releasing") return;
  const source = (locked?.toObject() as OrderRecord | undefined) ?? order;
  for (const item of source.items) {
    const key = `release:${source._id}:${skuOf(item)}`;
    try {
      await InventoryMovementModel.create({
        productId: item.productId,
        sku: skuOf(item),
        delta: item.quantity,
        reason,
        orderId: source._id,
        idempotencyKey: key,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) continue;
      throw error;
    }
    await adjustStock(item, item.quantity);
  }
  if (source.salesCounted) {
    for (const item of source.items) {
      await ProductModel.updateOne({ _id: item.productId }, { $inc: { salesCount: -item.quantity } });
    }
  }
  await OrderModel.updateOne({ _id: source._id }, { inventoryState: "released", salesCounted: false });
}

export async function createOrder(input: CheckoutInput): Promise<OrderRecord> {
  await connectDB();
  const existing = await OrderModel.findOne({ idempotencyKey: input.idempotencyKey }).lean<OrderRecord | null>();
  if (existing) {
    if (existing.customer.mobile !== input.mobile) {
      throw new AppError("This checkout was already submitted with different details.", 409);
    }
    return existing;
  }

  const settings = await getStoreSettings();
  const pin = checkPinServiceability(input.pinCode, settings.shipping);
  if (!pin.ok) throw new AppError(pin.message, 400);

  const ids = input.items.map((item) => new Types.ObjectId(item.productId));
  const products = await ProductModel.find({ _id: { $in: ids } }).lean<ProductRecord[]>();
  const byId = new Map(products.map((product) => [String(product._id), product]));
  const items: OrderItem[] = [];

  for (const requested of input.items) {
    const product = byId.get(requested.productId);
    if (!product || !product.isPublished || product.isArchived) {
      throw new AppError("A product in your bag is no longer available.", 400);
    }
    let variant: VariantRecord | null = null;
    if (product.variants.length > 0) {
      if (!requested.variantSku) throw new AppError(`Select a variant for ${product.name}.`, 400);
      variant = product.variants.find((item) => item.sku === requested.variantSku) ?? null;
      if (!variant) throw new AppError(`The selected variant of ${product.name} is unavailable.`, 400);
    } else if (requested.variantSku) {
      throw new AppError(`${product.name} does not have variants.`, 400);
    }
    const unitPricePaise = effectiveUnitPrice(product, variant);
    const available = variant ? variant.stockQuantity : product.stockQuantity;
    if (available < requested.quantity) throw new AppError(`${product.name} does not have enough stock.`, 409);
    items.push({
      productId: product._id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      variantSku: variant?.sku ?? null,
      variantName: variant?.name ?? "",
      imageUrl: product.images[0]?.url ?? "",
      unitPricePaise,
      quantity: requested.quantity,
      lineTotalPaise: unitPricePaise * requested.quantity,
    });
  }

  let couponCode = "";
  let couponId: Types.ObjectId | null = null;
  let draft: CouponDraft | null = null;
  if (input.couponCode) {
    const coupon = await CouponModel.findOne({ code: input.couponCode });
    if (!coupon) throw new AppError("Coupon code is not valid.", 400);
    draft = couponDraft(coupon);
    const reason = couponIsCurrentlyValid(draft, new Date());
    if (reason) throw new AppError(reason, 400);
    couponCode = coupon.code;
    couponId = coupon._id;
  }

  const totals = quoteTotals({
    lines: items.map((item) => ({ unitPricePaise: item.unitPricePaise, quantity: item.quantity })),
    coupon: draft,
    shipping: settings.shipping,
    tax: settings.tax,
  });
  if (couponCode && totals.discountPaise === 0) {
    throw new AppError("This coupon does not apply to the current order.", 400);
  }

  let created: { _id: Types.ObjectId; toObject: () => OrderRecord };
  try {
    created = await OrderModel.create({
      orderNumber: createOrderNumber(),
      publicToken: createPublicToken(),
      idempotencyKey: input.idempotencyKey,
      customer: { name: input.fullName, mobile: input.mobile, email: input.email },
      shippingAddress: {
        addressLine: input.addressLine,
        landmark: input.landmark,
        city: input.city,
        state: input.state,
        pinCode: input.pinCode,
      },
      items,
      ...totals,
      currency: "INR",
      couponCode,
      customerNotes: input.notes,
      paymentMethod: "upi_manual",
      paymentStatus: "pending",
      paymentReference: "",
      claims: [],
      orderStatus: "awaiting_payment",
      inventoryState: "pending",
      salesCounted: false,
      fulfillment: { courier: "", trackingNumber: "", shippedAt: null, deliveredAt: null },
      internalNotes: [],
      audit: [{ at: new Date(), actorId: null, action: "order.created", from: "", to: "awaiting_payment", note: "" }],
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const winner = await OrderModel.findOne({ idempotencyKey: input.idempotencyKey }).lean<OrderRecord | null>();
    if (winner && winner.customer.mobile === input.mobile) return winner;
    throw new AppError("This checkout was already submitted with different details.", 409);
  }

  const order = created.toObject();
  try {
    for (const item of order.items) await reserveItem(order._id, item);
    await OrderModel.updateOne({ _id: order._id }, { inventoryState: "reserved" });
    order.inventoryState = "reserved";
  } catch (error) {
    await rollbackReservation(order, "reserve_failed");
    await OrderModel.updateOne(
      { _id: order._id },
      {
        orderStatus: "cancelled",
        inventoryState: "released",
        $push: { audit: { at: new Date(), actorId: null, action: "order.stock_failed", from: "awaiting_payment", to: "cancelled", note: "" } },
      },
    );
    throw error instanceof AppError ? error : new AppError("Unable to reserve stock for this order.", 409);
  }

  if (couponId) {
    const consumed = await CouponModel.findOneAndUpdate(
      {
        _id: couponId,
        isActive: true,
        $or: [{ usageLimit: null }, { $expr: { $lt: ["$usageCount", "$usageLimit"] } }],
      },
      { $inc: { usageCount: 1 } },
    );
    if (!consumed) {
      await releaseOrderStock(order, "coupon_limit");
      await OrderModel.updateOne({ _id: order._id }, { orderStatus: "cancelled" });
      throw new AppError("This coupon has reached its usage limit.", 409);
    }
  }

  await CustomerModel.updateOne(
    { mobile: input.mobile },
    { $set: { name: input.fullName, email: input.email, lastOrderAt: new Date() }, $inc: { orderCount: 1 } },
    { upsert: true },
  );
  return (await OrderModel.findById(order._id).lean<OrderRecord>()) ?? order;
}

export async function paymentInstructionsFor(order: Pick<OrderRecord, "orderNumber" | "totalPaise">): Promise<PaymentInstructions & { qrDataUrl: string | null }> {
  const settings = await getStoreSettings();
  const merchant = resolveMerchant(settings);
  const instructions = manualUpiAdapter.createInstructions(
    { orderNumber: order.orderNumber, amountPaise: order.totalPaise, currency: "INR" },
    { vpa: merchant.vpa, name: merchant.name },
  );
  const qrDataUrl = instructions.upiUri ? await QRCode.toDataURL(instructions.upiUri, { margin: 1, width: 280 }) : null;
  return { ...instructions, qrDataUrl };
}

export function publicOrderView(order: OrderRecord, instructions?: PaymentInstructions & { qrDataUrl: string | null }) {
  return {
    orderNumber: order.orderNumber,
    publicToken: order.publicToken,
    createdAt: order.createdAt,
    customer: { name: order.customer.name },
    shippingAddress: order.shippingAddress,
    items: order.items.map((item) => ({
      name: item.name,
      slug: item.slug,
      sku: item.sku,
      variantName: item.variantName,
      imageUrl: item.imageUrl,
      unitPricePaise: item.unitPricePaise,
      quantity: item.quantity,
      lineTotalPaise: item.lineTotalPaise,
    })),
    subtotalPaise: order.subtotalPaise,
    discountPaise: order.discountPaise,
    shippingCostPaise: order.shippingCostPaise,
    taxPaise: order.taxPaise,
    totalPaise: order.totalPaise,
    currency: order.currency,
    couponCode: order.couponCode,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    paymentReference: order.paymentReference,
    fulfillment: {
      courier: order.fulfillment?.courier ?? "",
      trackingNumber: order.fulfillment?.trackingNumber ?? "",
    },
    instructions: instructions ?? null,
  };
}

export async function getOrderByToken(token: string): Promise<OrderRecord | null> {
  await connectDB();
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(token)) return null;
  return OrderModel.findOne({ publicToken: token }).lean<OrderRecord | null>();
}

export async function submitPaymentClaim(input: { publicToken: string; utr: string; note: string; receiptUrl?: string; receiptPublicId?: string }) {
  await connectDB();
  const order = await OrderModel.findOne({ publicToken: input.publicToken });
  if (!order) throw new AppError("Order not found.", 404);
  if (order.orderStatus === "cancelled") throw new AppError("This order is cancelled.", 409);
  if (order.paymentStatus === "paid") throw new AppError("This payment is already verified.", 409);
  if (!canTransitionPayment(order.paymentStatus, "claim_submitted") && order.paymentStatus !== "claim_submitted") {
    throw new AppError("A payment reference cannot be submitted for this order.", 409);
  }
  order.claims.push({
    utr: input.utr,
    note: input.note,
    receiptUrl: input.receiptUrl ?? "",
    receiptPublicId: input.receiptPublicId ?? "",
    submittedAt: new Date(),
    decision: "pending",
    decisionNote: "",
  });
  order.paymentStatus = "claim_submitted";
  order.paymentReference = input.utr;
  order.audit.push({ at: new Date(), actorId: null, action: "payment.claim_submitted", from: "", to: input.utr, note: "" });
  await order.save();
  return order.toObject() as OrderRecord;
}

export async function verifyPayment(orderId: string, actorId: string, note: string) {
  await connectDB();
  const order = await OrderModel.findOne({
    _id: orderId,
    paymentStatus: { $in: ["pending", "claim_submitted", "rejected"] },
    orderStatus: { $ne: "cancelled" },
  });
  if (!order) throw new AppError("This order cannot be marked paid.", 409);
  const previous = order.paymentStatus as PaymentStatus;
  if (!canTransitionPayment(previous, "paid")) throw new AppError("Invalid payment transition.", 409);
  order.paymentStatus = "paid";
  if (order.orderStatus === "awaiting_payment") order.orderStatus = "processing";
  if (order.inventoryState === "reserved") order.inventoryState = "committed";
  const lastClaim = order.claims.at(-1);
  if (lastClaim && lastClaim.decision === "pending") {
    lastClaim.decision = "verified";
    lastClaim.decisionNote = note;
    lastClaim.decidedAt = new Date();
    lastClaim.decidedBy = new Types.ObjectId(actorId);
  }
  order.audit.push({ at: new Date(), actorId: new Types.ObjectId(actorId), action: "payment.verified", from: previous, to: "paid", note });
  if (!order.salesCounted) {
    for (const item of order.items) {
      await ProductModel.updateOne({ _id: item.productId }, { $inc: { salesCount: item.quantity } });
    }
    order.salesCounted = true;
  }
  await order.save();
  return order.toObject() as OrderRecord;
}

export async function rejectPayment(orderId: string, actorId: string, note: string) {
  await connectDB();
  const order = await OrderModel.findById(orderId);
  if (!order) throw new AppError("Order not found.", 404);
  if (order.paymentStatus === "paid") throw new AppError("Verified payments cannot be rejected from this action.", 409);
  const previous = order.paymentStatus as PaymentStatus;
  if (!canTransitionPayment(previous, "rejected")) throw new AppError("Invalid payment transition.", 409);
  order.paymentStatus = "rejected";
  const lastClaim = order.claims.at(-1);
  if (lastClaim) {
    lastClaim.decision = "rejected";
    lastClaim.decisionNote = note;
    lastClaim.decidedAt = new Date();
    lastClaim.decidedBy = new Types.ObjectId(actorId);
  }
  order.audit.push({ at: new Date(), actorId: new Types.ObjectId(actorId), action: "payment.rejected", from: previous, to: "rejected", note });
  await order.save();
  return order.toObject() as OrderRecord;
}

export async function transitionOrder(orderId: string, actorId: string, next: OrderStatus, extra?: { courier?: string; trackingNumber?: string; note?: string }) {
  await connectDB();
  const order = await OrderModel.findById(orderId);
  if (!order) throw new AppError("Order not found.", 404);
  const previous = order.orderStatus as OrderStatus;
  if (!canTransitionOrder(previous, next)) throw new AppError(`Cannot change an order from ${previous} to ${next}.`, 409);
  if (next === "shipped" && (!extra?.courier || !extra.trackingNumber)) {
    throw new AppError("Courier name and tracking number are required to mark an order shipped.", 400);
  }
  if (next === "paid" as OrderStatus) throw new AppError("Payment status is changed separately from fulfilment.", 409);
  order.orderStatus = next;
  if (next === "shipped") {
    order.fulfillment.courier = extra?.courier ?? "";
    order.fulfillment.trackingNumber = extra?.trackingNumber ?? "";
    order.fulfillment.shippedAt = new Date();
  }
  if (next === "delivered") order.fulfillment.deliveredAt = new Date();
  if (next === "cancelled") {
    await releaseOrderStock(order.toObject() as OrderRecord, "order_cancelled");
    order.inventoryState = "released";
    order.salesCounted = false;
  }
  order.audit.push({ at: new Date(), actorId: new Types.ObjectId(actorId), action: "order.status", from: previous, to: next, note: extra?.note ?? "" });
  await order.save();
  return order.toObject() as OrderRecord;
}

export async function addInternalNote(orderId: string, actorId: string, body: string) {
  await connectDB();
  const order = await OrderModel.findByIdAndUpdate(
    orderId,
    { $push: { internalNotes: { body, authorId: new Types.ObjectId(actorId), createdAt: new Date() } } },
    { new: true },
  );
  if (!order) throw new AppError("Order not found.", 404);
  return order.toObject() as OrderRecord;
}
