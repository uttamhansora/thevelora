import { requireAdmin } from "@/lib/auth/guard";
import { handleError, json, readJson } from "@/lib/http";
import { writeAudit } from "@/services/audit";
import { archiveTaxonomy, saveTaxonomy } from "@/services/catalog";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin("categories.write", request);
    const { id } = await context.params;
    const item = await saveTaxonomy("category", await readJson(request), id);
    await writeAudit({ actorId: admin.id, actorEmail: admin.email, action: "category.update", entityType: "category", entityId: id });
    return json({ item });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin("categories.write", request);
    const { id } = await context.params;
    const item = await archiveTaxonomy("category", id);
    await writeAudit({ actorId: admin.id, actorEmail: admin.email, action: "category.archive", entityType: "category", entityId: id });
    return json({ item });
  } catch (error) {
    return handleError(error);
  }
}
