import { getCustomerFromRequest } from "@/lib/auth/customer-session";
import { handleError, json } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const customer = await getCustomerFromRequest(request);
    if (!customer) return json({ customer: null });
    return json({ customer });
  } catch (error) {
    return handleError(error);
  }
}
