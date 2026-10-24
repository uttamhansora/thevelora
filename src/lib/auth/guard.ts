import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { getSessionFromRequest, type AdminPrincipal } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/security/origin";
import { timingSafeStringEqual } from "@/lib/security/request";

export async function requireAdmin(permission: Permission, request: Request): Promise<AdminPrincipal> {
  const session = await getSessionFromRequest(request);
  if (!session) throw new AppError("Sign in to continue.", 401);
  if (!hasPermission(session.role, permission)) throw new AppError("You do not have access to this action.", 403);
  if (request.method !== "GET" && request.method !== "HEAD") {
    assertSameOrigin(request);
    const header = request.headers.get("x-csrf-token") ?? "";
    if (!header || !timingSafeStringEqual(header, session.csrfToken)) {
      throw new AppError("Invalid CSRF token. Refresh the page and try again.", 403);
    }
  }
  return session;
}
