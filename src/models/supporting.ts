import { Schema, model, models } from "mongoose";

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    actorEmail: { type: String, default: "" },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

const inventoryMovementSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    sku: { type: String, required: true },
    delta: { type: Number, required: true },
    reason: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    idempotencyKey: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

const reviewSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    body: { type: String, required: true },
    isPublished: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

const newsletterSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    consentAt: { type: Date, required: true },
  },
  { timestamps: true },
);

const rateLimitSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, required: true },
    windowStart: { type: Date, required: true },
  },
  { timestamps: true },
);
rateLimitSchema.index({ windowStart: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

const customerSchema = new Schema(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    email: { type: String, default: "" },
    orderCount: { type: Number, default: 0 },
    lastOrderAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const contactSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, default: "" },
    message: { type: String, required: true },
  },
  { timestamps: true },
);

export const AuditLogModel = models.AuditLog || model("AuditLog", auditLogSchema);
export const InventoryMovementModel = models.InventoryMovement || model("InventoryMovement", inventoryMovementSchema);
export const ReviewModel = models.Review || model("Review", reviewSchema);
export const NewsletterModel = models.Newsletter || model("Newsletter", newsletterSchema);
export const RateLimitModel = models.RateLimit || model("RateLimit", rateLimitSchema);
export const CustomerModel = models.Customer || model("Customer", customerSchema);
export const ContactMessageModel = models.ContactMessage || model("ContactMessage", contactSchema);
