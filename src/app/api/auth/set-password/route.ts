import { createCustomerSessionToken, getCustomerFromRequest, appendCustomerSessionCookie } from "@/lib/auth/customer-session";
import { AppError } from "@/lib/errors";
import { handleError, json, readJson } from "@/lib/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { customerPasswordSchema } from "@/lib/validation/catalog";
import { setCustomerPassword } from "@/services/customers";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getCustomerFromRequest(request);
    if (!session) throw new AppError("Sign in to continue.", 401);
    const body = customerPasswordSchema.parse(await readJson(request));
    await setCustomerPassword(session.id, body.password);
    const token = await createCustomerSessionToken(session.id);
    const response = json({ ok: true });
    appendCustomerSessionCookie(response, token);
    return response;
  } catch (error) {
    return handleError(error);
  }
}
