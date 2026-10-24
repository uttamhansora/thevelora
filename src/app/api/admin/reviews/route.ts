import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { connectDB } from "@/lib/db/mongoose";
import { handleError, json, readJson } from "@/lib/http";
import { objectIdSchema } from "@/lib/validation/common";
import { ReviewModel } from "@/models/supporting";
import { writeAudit } from "@/services/audit";

export async function GET(request: Request) {
  try {
    await requireAdmin("reviews.moderate", request);
    await connectDB();
    const items = await ReviewModel.find().sort({ createdAt: -1 }).limit(100).lean();
    return json({ items });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin("reviews.moderate", request);
    const body = z.object({ id: objectIdSchema, isPublished: z.boolean() }).parse(await readJson(request));
    await connectDB();
    const item = await ReviewModel.findByIdAndUpdate(body.id, { isPublished: body.isPublished }, { new: true });
    await writeAudit({ actorId: admin.id, actorEmail: admin.email, action: "review.moderate", entityType: "review", entityId: body.id, metadata: { isPublished: body.isPublished } });
    return json({ item });
  } catch (error) {
    return handleError(error);
  }
}
