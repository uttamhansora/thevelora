import { requireAdmin } from "@/lib/auth/guard";
import { connectDB } from "@/lib/db/mongoose";
import { handleError, json, readJson } from "@/lib/http";
import { isDuplicateKeyError } from "@/lib/mongo";
import { AppError } from "@/lib/errors";
import { couponInputSchema } from "@/lib/validation/catalog";
import { CouponModel } from "@/models/coupon";
import { writeAudit } from "@/services/audit";

export async function GET(request: Request) {
  try {
    await requireAdmin("coupons.write", request);
    await connectDB();
    const items = await CouponModel.find().sort({ createdAt: -1 }).lean();
    return json({ items });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin("coupons.write", request);
    const body = couponInputSchema.parse(await readJson(request));
    await connectDB();
    try {
      const item = await CouponModel.create({
        ...body,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      });
      await writeAudit({ actorId: admin.id, actorEmail: admin.email, action: "coupon.create", entityType: "coupon", entityId: String(item._id) });
      return json({ item }, 201);
    } catch (error) {
      if (isDuplicateKeyError(error)) throw new AppError("That coupon code already exists.", 409);
      throw error;
    }
  } catch (error) {
    return handleError(error);
  }
}
