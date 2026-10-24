import { Schema, model, models, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["super_admin", "product_manager", "order_manager"], required: true },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: import("mongoose").Types.ObjectId };
export const UserModel = models.User || model("User", userSchema);
