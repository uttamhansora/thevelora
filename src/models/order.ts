import { Schema, model, models } from "mongoose";

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    sku: { type: String, required: true },
    variantSku: { type: String, default: null },
    variantName: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    unitPricePaise: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotalPaise: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const claimSchema = new Schema(
  {
    utr: { type: String, required: true },
    note: { type: String, default: "" },
    receiptUrl: { type: String, default: "" },
    receiptPublicId: { type: String, default: "" },
    submittedAt: { type: Date, required: true },
    decision: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
    decisionNote: { type: String, default: "" },
    decidedAt: { type: Date, default: null },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: true },
);

const auditSchema = new Schema(
  {
    at: { type: Date, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, required: true },
    from: { type: String, default: "" },
    to: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    publicToken: { type: String, required: true, unique: true },
    idempotencyKey: { type: String, required: true, unique: true },
    customer: {
      name: { type: String, required: true },
      mobile: { type: String, required: true, index: true },
      email: { type: String, default: "" },
    },
    shippingAddress: {
      addressLine: { type: String, required: true },
      landmark: { type: String, default: "" },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pinCode: { type: String, required: true },
    },
    items: { type: [orderItemSchema], required: true },
    subtotalPaise: { type: Number, required: true, min: 0 },
    discountPaise: { type: Number, required: true, min: 0, default: 0 },
    shippingCostPaise: { type: Number, required: true, min: 0, default: 0 },
    taxPaise: { type: Number, required: true, min: 0, default: 0 },
    totalPaise: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    couponCode: { type: String, default: "" },
    customerNotes: { type: String, default: "" },
    paymentMethod: { type: String, enum: ["upi_manual"], default: "upi_manual" },
    paymentStatus: {
      type: String,
      enum: ["pending", "claim_submitted", "paid", "rejected", "refunded"],
      default: "pending",
      index: true,
    },
    paymentReference: { type: String, default: "" },
    claims: { type: [claimSchema], default: [] },
    orderStatus: {
      type: String,
      enum: ["awaiting_payment", "processing", "shipped", "delivered", "cancelled"],
      default: "awaiting_payment",
      index: true,
    },
    inventoryState: { type: String, enum: ["pending", "reserved", "releasing", "committed", "released"], default: "pending" },
    salesCounted: { type: Boolean, default: false },
    fulfillment: {
      courier: { type: String, default: "" },
      trackingNumber: { type: String, default: "" },
      shippedAt: { type: Date, default: null },
      deliveredAt: { type: Date, default: null },
    },
    internalNotes: { type: [{ body: String, authorId: Schema.Types.ObjectId, createdAt: Date }], default: [] },
    audit: { type: [auditSchema], default: [] },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ "customer.name": 1 });
orderSchema.index({ paymentReference: 1 });

export const OrderModel = models.Order || model("Order", orderSchema);
