import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors";
import { handleError, json, readJson } from "@/lib/http";
import { ORDER_STATUSES } from "@/lib/order-state";
import { OrderModel } from "@/models/order";
import { writeAudit } from "@/services/audit";
import { addInternalNote, transitionOrder } from "@/services/orders";

const patchSchema = z.object({
  orderStatus: z.enum(ORDER_STATUSES).optional(),
  courier: z.string().trim().max(80).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
  note: z.string().trim().max(1000).optional(),
  internalNote: z.string().trim().max(1000).optional(),
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin("orders.write", request);
    await connectDB();
    const { id } = await context.params;
    const order = await OrderModel.findById(id).lean();
    if (!order) throw new AppError("Order not found.", 404);
    return json({ order });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin("orders.write", request);
    const { id } = await context.params;
    const body = patchSchema.parse(await readJson(request));
    if (body.internalNote) await addInternalNote(id, admin.id, body.internalNote);
    const order = body.orderStatus
      ? await transitionOrder(id, admin.id, body.orderStatus, { courier: body.courier, trackingNumber: body.trackingNumber, note: body.note })
      : (await OrderModel.findById(id).lean());
    if (!order) throw new AppError("Order not found.", 404);
    if (body.orderStatus) {
      await writeAudit({
        actorId: admin.id,
        actorEmail: admin.email,
        action: "order.status",
        entityType: "order",
        entityId: id,
        metadata: { to: body.orderStatus },
      });
    }
    return json({ order });
  } catch (error) {
    return handleError(error);
  }
}
