import { requireAdmin } from "@/lib/auth/guard";
import { handleError, json } from "@/lib/http";
import { getDashboard } from "@/services/dashboard";

export async function GET(request: Request) {
  try {
    await requireAdmin("dashboard.read", request);
    return json(await getDashboard());
  } catch (error) {
    return handleError(error);
  }
}
