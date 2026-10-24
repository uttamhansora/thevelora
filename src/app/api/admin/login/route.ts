import { createAdminSession, serializeCookie, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors";
import { handleError, json, readJson } from "@/lib/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { getClientIp } from "@/lib/security/request";
import { loginSchema } from "@/lib/validation/catalog";
import { UserModel } from "@/models/user";
import { writeAudit } from "@/services/audit";
import { consumeRateLimit } from "@/services/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = loginSchema.parse(await readJson(request));
    await consumeRateLimit("login", `${getClientIp(request)}:${body.email}`);
    await connectDB();
    const user = await UserModel.findOne({ email: body.email }).select("+passwordHash name email role status");
    if (!user || user.status !== "active" || !(await verifyPassword(user.passwordHash, body.password))) {
      throw new AppError("Invalid email or password.", 401);
    }
    const session = await createAdminSession({ id: String(user._id), role: user.role });
    await writeAudit({ actorId: String(user._id), actorEmail: user.email, action: "auth.login", entityType: "user", entityId: String(user._id) });
    const response = json({ ok: true, csrfToken: session.csrfToken, name: user.name, role: user.role });
    response.headers.append("Set-Cookie", serializeCookie(SESSION_COOKIE, session.token, sessionCookieOptions().maxAge));
    return response;
  } catch (error) {
    return handleError(error);
  }
}
