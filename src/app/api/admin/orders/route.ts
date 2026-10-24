import { requireAdmin } from "@/lib/auth/guard";
import { connectDB } from "@/lib/db/mongoose";
import { handleError, json } from "@/lib/http";
import { escapeRegex, parseLimit, parsePage, sanitizeSearch } from "@/lib/search";
import { OrderModel } from "@/models/order";

export async function GET(request: Request) {
  try {
    await requireAdmin("orders.write", request);
    await connectDB();
    const url = new URL(request.url);
    const page = parsePage(url.searchParams.get("page"));
    const limit = parseLimit(url.searchParams.get("limit"), 20, 100);
    const q = sanitizeSearch(url.searchParams.get("q") ?? "");
    const filter: Record<string, unknown> = {};
    const orderStatus = url.searchParams.get("orderStatus");
    const paymentStatus = url.searchParams.get("paymentStatus");
    if (orderStatus) filter.orderStatus = orderStatus;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (q) {
      const pattern = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ orderNumber: pattern }, { "customer.name": pattern }, { "customer.mobile": pattern }, { paymentReference: pattern }];
    }
    const [items, total] = await Promise.all([
      OrderModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      OrderModel.countDocuments(filter),
    ]);
    return json({ items, total, page, limit });
  } catch (error) {
    return handleError(error);
  }
}
