import { reviewInputSchema } from "@/lib/validation/catalog";
import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors";
import { handleError, json, readJson } from "@/lib/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { getClientIp } from "@/lib/security/request";
import { ProductModel } from "@/models/product";
import { ReviewModel } from "@/models/supporting";
import { consumeRateLimit } from "@/services/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await consumeRateLimit("review", getClientIp(request));
    const body = reviewInputSchema.parse(await readJson(request));
    await connectDB();
    const product = await ProductModel.findOne({ _id: body.productId, isPublished: true, isArchived: false });
    if (!product) throw new AppError("Product not found.", 404);
    await ReviewModel.create({ ...body, isPublished: false });
    return json({ ok: true, message: "Thank you. Your review will appear after the store moderates it." }, 201);
  } catch (error) {
    return handleError(error);
  }
}
