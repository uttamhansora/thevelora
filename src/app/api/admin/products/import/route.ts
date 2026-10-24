import { requireAdmin } from "@/lib/auth/guard";
import { AppError } from "@/lib/errors";
import { handleError, json } from "@/lib/http";
import { writeAudit } from "@/services/audit";
import { importProductsCsv } from "@/services/csv-products";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin("products.write", request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("Choose a CSV file.", 400);
    if (file.size > 2_000_000) throw new AppError("CSV files must be 2 MB or smaller.", 413);
    const report = await importProductsCsv(await file.text());
    await writeAudit({ actorId: admin.id, actorEmail: admin.email, action: "product.import", entityType: "product", metadata: { created: report.created, errors: report.errors.length } });
    return json(report);
  } catch (error) {
    return handleError(error);
  }
}
