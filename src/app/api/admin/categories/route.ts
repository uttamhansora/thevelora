import { requireAdmin } from "@/lib/auth/guard";
import { handleError, json, readJson } from "@/lib/http";
import { writeAudit } from "@/services/audit";
import { listTaxonomy, saveTaxonomy } from "@/services/catalog";

export async function GET(request: Request) {
  try {
    await requireAdmin("categories.write", request);
    const items = await listTaxonomy("category", true);
    return json({ items });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin("categories.write", request);
    const item = await saveTaxonomy("category", await readJson(request));
    await writeAudit({ actorId: admin.id, actorEmail: admin.email, action: "category.create", entityType: "category", entityId: String(item._id) });
    return json({ item }, 201);
  } catch (error) {
    return handleError(error);
  }
}
