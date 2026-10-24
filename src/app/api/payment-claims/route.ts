import { paymentClaimSchema } from "@/lib/validation/catalog";
import { handleError, json, readJson } from "@/lib/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { getClientIp } from "@/lib/security/request";
import { storeImage } from "@/lib/images/storage";
import { publicOrderView, submitPaymentClaim } from "@/services/orders";
import { consumeRateLimit } from "@/services/rate-limit";
import { writeAudit } from "@/services/audit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await consumeRateLimit("claim", getClientIp(request));
    const type = request.headers.get("content-type") ?? "";
    let publicToken = "";
    let utr = "";
    let note = "";
    let receiptUrl = "";
    let receiptPublicId = "";
    if (type.includes("multipart/form-data")) {
      const form = await request.formData();
      publicToken = String(form.get("publicToken") ?? "");
      utr = String(form.get("utr") ?? "");
      note = String(form.get("note") ?? "");
      const file = form.get("receipt");
      if (file instanceof File && file.size > 0) {
        const stored = await storeImage(file);
        receiptUrl = stored.url;
        receiptPublicId = stored.publicId;
      }
    } else {
      const body = paymentClaimSchema.parse(await readJson(request));
      publicToken = body.publicToken;
      utr = body.utr;
      note = body.note;
    }
    const parsed = paymentClaimSchema.parse({ publicToken, utr, note });
    const order = await submitPaymentClaim({ ...parsed, receiptUrl, receiptPublicId });
    await writeAudit({ action: "payment.claim_submitted", entityType: "order", entityId: String(order._id), metadata: { utr: parsed.utr } });
    return json({ order: publicOrderView(order) });
  } catch (error) {
    return handleError(error);
  }
}
