import { connectDB, isDemoModeEnabled } from "@/lib/db/mongoose";
import { defaultStoreSettings, storeSettingsSchema, type StoreSettingsData } from "@/lib/validation/settings";
import { StoreSettingsModel } from "@/models/store-settings";

function mergeSettings(stored: unknown): StoreSettingsData {
  if (!stored || typeof stored !== "object") return defaultStoreSettings;
  const source = stored as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...defaultStoreSettings, ...source };
  for (const key of Object.keys(defaultStoreSettings) as (keyof StoreSettingsData)[]) {
    const base = defaultStoreSettings[key];
    const incoming = source[key];
    if (Array.isArray(base)) {
      merged[key] = Array.isArray(incoming) ? incoming : base;
    } else if (base && typeof base === "object") {
      merged[key] = { ...(base as object), ...(incoming && typeof incoming === "object" ? incoming : {}) };
    }
  }
  const parsed = storeSettingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : defaultStoreSettings;
}

export async function getStoreSettings(): Promise<StoreSettingsData> {
  await connectDB();
  const doc = await StoreSettingsModel.findOne({ key: "store" }).lean<{ data?: unknown } | null>();
  if (!doc) return defaultStoreSettings;
  return mergeSettings(doc.data);
}

export async function saveStoreSettings(data: StoreSettingsData): Promise<StoreSettingsData> {
  await connectDB();
  const parsed = storeSettingsSchema.parse(data);
  await StoreSettingsModel.updateOne({ key: "store" }, { key: "store", data: parsed }, { upsert: true });
  return parsed;
}

export function publicSettings(settings: StoreSettingsData) {
  return {
    ...settings,
    payment: {
      merchantName: settings.payment.merchantName,
      instructions: settings.payment.instructions,
      configured: Boolean(resolveMerchant(settings).vpa),
    },
  };
}

export function resolveMerchant(settings: StoreSettingsData): { vpa: string; name: string; source: "environment" | "settings" | "missing" } {
  const envVpa = process.env.MERCHANT_UPI_ID?.trim() ?? "";
  const envName = process.env.MERCHANT_UPI_NAME?.trim() ?? "";
  if (envVpa) return { vpa: envVpa, name: envName || settings.payment.merchantName || "THE VELORA", source: "environment" };
  if (settings.payment.merchantUpiId) return { vpa: settings.payment.merchantUpiId, name: settings.payment.merchantName || "THE VELORA", source: "settings" };
  return { vpa: "", name: envName || settings.payment.merchantName || "THE VELORA", source: "missing" };
}

export async function getStoreSettingsSafe(): Promise<{ settings: StoreSettingsData; unavailable: boolean }> {
  if (isDemoModeEnabled()) {
    return { settings: defaultStoreSettings, unavailable: false };
  }
  try {
    return { settings: await getStoreSettings(), unavailable: false };
  } catch {
    return { settings: defaultStoreSettings, unavailable: true };
  }
}
