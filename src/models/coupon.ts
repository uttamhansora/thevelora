import { Schema, model, models } from "mongoose";

const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValueBps: { type: Number, default: 0, min: 0 },
    discountValuePaise: { type: Number, default: 0, min: 0 },
    minimumOrderValuePaise: { type: Number, default: 0, min: 0 },
    maximumDiscountPaise: { type: Number, default: null },
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    usageLimit: { type: Number, default: null },
    usageCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const CouponModel = models.Coupon || model("Coupon", couponSchema);
