import { z } from "zod";
import { handleError, json, readJson } from "@/lib/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { objectIdSchema } from "@/lib/validation/common";
import { quoteCart } from "@/services/quote";

const schema = z.object({
  items: z.array(z.object({ productId: objectIdSchema, variantSku: z.string().trim().toUpperCase().nullable().default(null), quantity: z.number().int().min(1).max(10) })).max(20),
  couponCode: z.string().trim().max(32).default(""),
  pinCode: z.string().trim().default(""),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = schema.parse(await readJson(request));
    const quote = await quoteCart({ ...body, pinCode: body.pinCode || undefined });
    return json(quote);
  } catch (error) {
    return handleError(error);
  }
}
