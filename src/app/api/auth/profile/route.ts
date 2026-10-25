import { getCustomerFromRequest } from "@/lib/auth/customer-session";
import { AppError } from "@/lib/errors";
import { handleError, json, readJson } from "@/lib/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { customerProfileSchema } from "@/lib/validation/catalog";
import { updateCustomerProfile } from "@/services/customers";

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getCustomerFromRequest(request);
    if (!session) throw new AppError("Sign in to continue.", 401);
    const body = customerProfileSchema.parse(await readJson(request));
    const customer = await updateCustomerProfile(session.id, body);
    return json({
      ok: true,
      customer: { name: customer.name, mobile: customer.mobile, email: customer.email ?? "" },
    });
  } catch (error) {
    return handleError(error);
  }
}
