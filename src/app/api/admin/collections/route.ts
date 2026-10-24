import { requireAdmin } from "@/lib/auth/guard";
import { handleError, json, readJson } from "@/lib/http";
import { writeAudit } from "@/services/audit";
import { listTaxonomy, saveTaxonomy } from "@/services/catalog";

export async function GET(request: Request) {
  try {
    await requireAdmin("collections.write", request);
    return json({ items: await listTaxonomy("collection", true) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin("collections.write", request);
    const item = await saveTaxonomy("collection", await readJson(request));
    await writeAudit({ actorId: admin.id, actorEmail: admin.email, action: "collection.create", entityType: "collection", entityId: String(item._id) });
    return json({ item }, 201);
  } catch (error) {
    return handleError(error);
  }
}
