import { contactSchema } from "@/lib/validation/catalog";
import { connectDB } from "@/lib/db/mongoose";
import { handleError, json, readJson } from "@/lib/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { getClientIp } from "@/lib/security/request";
import { ContactMessageModel } from "@/models/supporting";
import { consumeRateLimit } from "@/services/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await consumeRateLimit("contact", getClientIp(request));
    const body = contactSchema.parse(await readJson(request));
    await connectDB();
    await ContactMessageModel.create(body);
    return json({ ok: true }, 201);
  } catch (error) {
    return handleError(error);
  }
}
