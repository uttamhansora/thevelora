import { getCustomerFromRequest } from "@/lib/auth/customer-session";
import { AppError } from "@/lib/errors";
import { handleError, json } from "@/lib/http";
import { listOrdersForCustomer } from "@/services/orders";

export async function GET(request: Request) {
  try {
    const session = await getCustomerFromRequest(request);
    if (!session) throw new AppError("Sign in to continue.", 401);
    const orders = await listOrdersForCustomer(session.mobile);
    return json({ orders });
  } catch (error) {
    return handleError(error);
  }
}
