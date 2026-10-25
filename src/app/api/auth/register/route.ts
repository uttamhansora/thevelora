import { appendCustomerSessionCookie, createCustomerSessionToken } from "@/lib/auth/customer-session";
import { handleError, json, readJson } from "@/lib/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { getClientIp } from "@/lib/security/request";
import { customerRegisterSchema } from "@/lib/validation/catalog";
import { registerCustomer } from "@/services/customers";
import { consumeRateLimit } from "@/services/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await consumeRateLimit("login", `register:${getClientIp(request)}`);
    const body = customerRegisterSchema.parse(await readJson(request));
    const customer = await registerCustomer(body);
    const token = await createCustomerSessionToken(String(customer._id));
    const response = json({
      ok: true,
      customer: { name: customer.name, mobile: customer.mobile, email: customer.email ?? "" },
    });
    appendCustomerSessionCookie(response, token);
    return response;
  } catch (error) {
    return handleError(error);
  }
}
