import { requireAdmin } from "@/lib/auth/guard";
import { AppError } from "@/lib/errors";
import { handleError, json } from "@/lib/http";
import { storeImage } from "@/lib/images/storage";
import { writeAudit } from "@/services/audit";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin("uploads.write", request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("Choose an image to upload.", 400);
    const image = await storeImage(file);
    await writeAudit({ actorId: admin.id, actorEmail: admin.email, action: "upload.create", entityType: "image", entityId: image.publicId });
    return json({ image }, 201);
  } catch (error) {
    return handleError(error);
  }
}
