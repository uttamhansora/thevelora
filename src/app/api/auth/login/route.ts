import { appendCustomerSessionCookie, createCustomerSessionToken } from "@/lib/auth/customer-session";
import { handleError, json, readJson } from "@/lib/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { getClientIp } from "@/lib/security/request";
import { customerLoginSchema } from "@/lib/validation/catalog";
import { loginCustomer } from "@/services/customers";
import { consumeRateLimit } from "@/services/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await consumeRateLimit("login", `customer:${getClientIp(request)}`);
    const body = customerLoginSchema.parse(await readJson(request));
    const customer = await loginCustomer(body.mobile, body.password);
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
