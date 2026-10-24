import { requireAdmin } from "@/lib/auth/guard";
import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors";
import { handleError, json, readJson } from "@/lib/http";
import { couponInputSchema } from "@/lib/validation/catalog";
import { CouponModel } from "@/models/coupon";
import { writeAudit } from "@/services/audit";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin("coupons.write", request);
    const { id } = await context.params;
    const body = couponInputSchema.parse(await readJson(request));
    await connectDB();
    const item = await CouponModel.findByIdAndUpdate(
      id,
      { ...body, startsAt: body.startsAt ? new Date(body.startsAt) : null, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null },
      { new: true },
    );
    if (!item) throw new AppError("Coupon not found.", 404);
    await writeAudit({ actorId: admin.id, actorEmail: admin.email, action: "coupon.update", entityType: "coupon", entityId: id });
    return json({ item });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin("coupons.write", request);
    const { id } = await context.params;
    await connectDB();
    const item = await CouponModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!item) throw new AppError("Coupon not found.", 404);
    await writeAudit({ actorId: admin.id, actorEmail: admin.email, action: "coupon.deactivate", entityType: "coupon", entityId: id });
    return json({ item });
  } catch (error) {
    return handleError(error);
  }
}
