import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { handleError, json, readJson } from "@/lib/http";
import { objectIdSchema } from "@/lib/validation/common";
import { writeAudit } from "@/services/audit";
import { rejectPayment, verifyPayment } from "@/services/orders";

const schema = z.object({
  orderId: objectIdSchema,
  action: z.enum(["verify", "reject"]),
  note: z.string().trim().max(500).default(""),
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin("payments.verify", request);
    const body = schema.parse(await readJson(request));
    const order = body.action === "verify" ? await verifyPayment(body.orderId, admin.id, body.note) : await rejectPayment(body.orderId, admin.id, body.note);
    await writeAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: body.action === "verify" ? "payment.verified" : "payment.rejected",
      entityType: "order",
      entityId: body.orderId,
      metadata: { note: body.note, paymentStatus: order.paymentStatus, orderStatus: order.orderStatus },
    });
    return json({ order });
  } catch (error) {
    return handleError(error);
  }
}
