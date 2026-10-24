import { newsletterSchema } from "@/lib/validation/catalog";
import { connectDB } from "@/lib/db/mongoose";
import { handleError, json, readJson } from "@/lib/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { getClientIp } from "@/lib/security/request";
import { NewsletterModel } from "@/models/supporting";
import { consumeRateLimit } from "@/services/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await consumeRateLimit("newsletter", getClientIp(request));
    const body = newsletterSchema.parse(await readJson(request));
    await connectDB();
    await NewsletterModel.updateOne({ email: body.email }, { email: body.email, consentAt: new Date() }, { upsert: true });
    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
