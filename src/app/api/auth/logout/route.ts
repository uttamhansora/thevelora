import { clearCustomerSessionCookie } from "@/lib/auth/customer-session";
import { handleError, json } from "@/lib/http";
import { assertSameOrigin } from "@/lib/security/origin";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const response = json({ ok: true });
    clearCustomerSessionCookie(response);
    return response;
  } catch (error) {
    return handleError(error);
  }
}
