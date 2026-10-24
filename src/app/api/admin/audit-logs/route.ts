import { requireAdmin } from "@/lib/auth/guard";
import { connectDB } from "@/lib/db/mongoose";
import { handleError, json } from "@/lib/http";
import { parseLimit, parsePage } from "@/lib/search";
import { AuditLogModel } from "@/models/supporting";

export async function GET(request: Request) {
  try {
    await requireAdmin("audit.read", request);
    await connectDB();
    const url = new URL(request.url);
    const page = parsePage(url.searchParams.get("page"));
    const limit = parseLimit(url.searchParams.get("limit"), 30, 100);
    const [items, total] = await Promise.all([
      AuditLogModel.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLogModel.countDocuments(),
    ]);
    return json({ items, total, page, limit });
  } catch (error) {
    return handleError(error);
  }
}
