import { Schema, model, models } from "mongoose";

const storeSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "store" },
    data: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

export const StoreSettingsModel = models.StoreSettings || model("StoreSettings", storeSettingsSchema);
