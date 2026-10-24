import { requireAdmin } from "@/lib/auth/guard";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createAdminSession, revokeAllSessions, serializeCookie, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors";
import { handleError, json, readJson } from "@/lib/http";
import { passwordChangeSchema } from "@/lib/validation/catalog";
import { UserModel } from "@/models/user";
import { writeAudit } from "@/services/audit";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin("profile.write", request);
    const body = passwordChangeSchema.parse(await readJson(request));
    await connectDB();
    const user = await UserModel.findById(admin.id).select("+passwordHash role");
    if (!user || !(await verifyPassword(user.passwordHash, body.currentPassword))) {
      throw new AppError("Current password is incorrect.", 400);
    }
    user.passwordHash = await hashPassword(body.newPassword);
    await user.save();
    await revokeAllSessions(admin.id);
    const session = await createAdminSession({ id: admin.id, role: user.role });
    await writeAudit({ actorId: admin.id, actorEmail: admin.email, action: "auth.password_change", entityType: "user", entityId: admin.id });
    const response = json({ ok: true, csrfToken: session.csrfToken });
    response.headers.append("Set-Cookie", serializeCookie(SESSION_COOKIE, session.token, sessionCookieOptions().maxAge));
    return response;
  } catch (error) {
    return handleError(error);
  }
}
