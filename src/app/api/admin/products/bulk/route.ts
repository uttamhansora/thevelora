import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { handleError, json, readJson } from "@/lib/http";
import { writeAudit } from "@/services/audit";
import { setProductFlags } from "@/services/catalog";

const schema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  action: z.enum(["publish", "unpublish", "archive"]),
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin("products.write", request);
    const body = schema.parse(await readJson(request));
    const modified = await setProductFlags(body.ids, body.action);
    await writeAudit({ actorId: admin.id, actorEmail: admin.email, action: `product.bulk_${body.action}`, entityType: "product", metadata: { ids: body.ids, modified } });
    return json({ modified });
  } catch (error) {
    return handleError(error);
  }
}
