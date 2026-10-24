import { requireAdmin } from "@/lib/auth/guard";
import { handleError } from "@/lib/http";
import { exportProductsCsv } from "@/services/csv-products";

export async function GET(request: Request) {
  try {
    await requireAdmin("products.write", request);
    const csv = await exportProductsCsv();
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"the-velora-products.csv\"",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
