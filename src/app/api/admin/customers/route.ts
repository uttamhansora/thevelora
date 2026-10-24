import { requireAdmin } from "@/lib/auth/guard";
import { connectDB } from "@/lib/db/mongoose";
import { handleError, json } from "@/lib/http";
import { escapeRegex, parseLimit, parsePage, sanitizeSearch } from "@/lib/search";
import { CustomerModel } from "@/models/supporting";

export async function GET(request: Request) {
  try {
    await requireAdmin("customers.read", request);
    await connectDB();
    const url = new URL(request.url);
    const page = parsePage(url.searchParams.get("page"));
    const limit = parseLimit(url.searchParams.get("limit"), 20, 100);
    const q = sanitizeSearch(url.searchParams.get("q") ?? "");
    const filter = q ? { $or: [{ name: new RegExp(escapeRegex(q), "i") }, { mobile: new RegExp(escapeRegex(q)) }, { email: new RegExp(escapeRegex(q), "i") }] } : {};
    const [items, total] = await Promise.all([
      CustomerModel.find(filter).sort({ lastOrderAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      CustomerModel.countDocuments(filter),
    ]);
    return json({ items, total, page, limit });
  } catch (error) {
    return handleError(error);
  }
}
