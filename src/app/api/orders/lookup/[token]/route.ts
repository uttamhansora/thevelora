import { AppError } from "@/lib/errors";
import { handleError, json } from "@/lib/http";
import { getClientIp } from "@/lib/security/request";
import { getOrderByToken, paymentInstructionsFor, publicOrderView } from "@/services/orders";
import { consumeRateLimit } from "@/services/rate-limit";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    await consumeRateLimit("order", `lookup:${getClientIp(request)}`);
    const { token } = await context.params;
    const order = await getOrderByToken(token);
    if (!order) throw new AppError("Order not found.", 404);
    const instructions = order.paymentStatus === "paid" ? undefined : await paymentInstructionsFor(order);
    return json({ order: publicOrderView(order, instructions) });
  } catch (error) {
    return handleError(error);
  }
}
