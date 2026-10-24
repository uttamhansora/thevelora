import { checkoutSchema } from "@/lib/validation/catalog";
import { handleError, json, readJson } from "@/lib/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { getClientIp } from "@/lib/security/request";
import { createOrder, paymentInstructionsFor, publicOrderView } from "@/services/orders";
import { consumeRateLimit } from "@/services/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await consumeRateLimit("order", getClientIp(request));
    const input = checkoutSchema.parse(await readJson(request));
    const order = await createOrder(input);
    const instructions = await paymentInstructionsFor(order);
    return json({ order: publicOrderView(order, instructions) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
