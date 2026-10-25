import { appendCustomerSessionCookie, createCustomerSessionToken } from "@/lib/auth/customer-session";
import { connectDB } from "@/lib/db/mongoose";
import { checkoutSchema } from "@/lib/validation/catalog";
import { handleError, json, readJson } from "@/lib/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { getClientIp } from "@/lib/security/request";
import { CustomerModel } from "@/models/supporting";
import { createOrder, paymentInstructionsFor, publicOrderView } from "@/services/orders";
import { consumeRateLimit } from "@/services/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await consumeRateLimit("order", getClientIp(request));
    const input = checkoutSchema.parse(await readJson(request));
    const order = await createOrder(input);
    const instructions = await paymentInstructionsFor(order);
    await connectDB();
    const customer = await CustomerModel.findOne({ mobile: input.mobile }).select("+passwordHash");
    const response = json(
      {
        order: publicOrderView(order, instructions),
        account: customer
          ? { registered: true, signedIn: true, hasPassword: Boolean(customer.passwordHash) }
          : null,
      },
      201,
    );
    if (customer) {
      const token = await createCustomerSessionToken(String(customer._id));
      appendCustomerSessionCookie(response, token);
    }
    return response;
  } catch (error) {
    return handleError(error);
  }
}
