import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { hasPermission } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors";
import { handleError, json, readJson } from "@/lib/http";
import { storeSettingsSchema } from "@/lib/validation/settings";
import { imageStorageStatus } from "@/lib/images/storage";
import { writeAudit } from "@/services/audit";
import { getStoreSettings, resolveMerchant, saveStoreSettings } from "@/services/settings";

const patchSchema = z.object({
  section: z.enum(["homepage", "shipping", "payment", "store"]),
  data: z.record(z.unknown()),
});

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin("dashboard.read", request);
    const settings = await getStoreSettings();
    const merchant = resolveMerchant(settings);
    return json({
      settings,
      merchant: {
        source: merchant.source,
        configured: Boolean(merchant.vpa),
        vpa: hasPermission(admin.role, "settings.write") ? merchant.vpa : "",
        name: merchant.name,
      },
      images: imageStorageStatus(),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin("dashboard.read", request);
    const body = patchSchema.parse(await readJson(request));
    const permission =
      body.section === "shipping" ? "shipping.write" : body.section === "homepage" ? "homepage.write" : "settings.write";
    if (!hasPermission(admin.role, permission)) throw new AppError("You do not have access to this action.", 403);
    const current = await getStoreSettings();
    const next = { ...current };
    if (body.section === "homepage") {
      next.announcement = { ...current.announcement, ...(body.data.announcement as object) };
      next.hero = { ...current.hero, ...(body.data.hero as object) };
      next.sections = { ...current.sections, ...(body.data.sections as object) };
      if (Array.isArray(body.data.categoryCards)) next.categoryCards = body.data.categoryCards as typeof current.categoryCards;
      if (Array.isArray(body.data.featuredCollectionSlugs)) next.featuredCollectionSlugs = body.data.featuredCollectionSlugs as string[];
      if (body.data.brandStory) next.brandStory = body.data.brandStory as typeof current.brandStory;
      if (Array.isArray(body.data.whyShop)) next.whyShop = body.data.whyShop as typeof current.whyShop;
    } else if (body.section === "shipping") {
      next.shipping = { ...current.shipping, ...(body.data as object) };
    } else if (body.section === "payment") {
      next.payment = { ...current.payment, ...(body.data as object) };
    } else {
      if (body.data.contact) next.contact = body.data.contact as typeof current.contact;
      if (body.data.social) next.social = body.data.social as typeof current.social;
      if (body.data.policies) next.policies = body.data.policies as typeof current.policies;
      if (body.data.tax) next.tax = body.data.tax as typeof current.tax;
      if (body.data.seo) next.seo = body.data.seo as typeof current.seo;
      if (Array.isArray(body.data.footerLinks)) next.footerLinks = body.data.footerLinks as typeof current.footerLinks;
    }
    const saved = await saveStoreSettings(storeSettingsSchema.parse(next));
    await writeAudit({ actorId: admin.id, actorEmail: admin.email, action: `settings.${body.section}`, entityType: "settings", entityId: "store" });
    return json({ settings: saved });
  } catch (error) {
    return handleError(error);
  }
}
