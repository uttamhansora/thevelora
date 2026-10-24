import { randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { connectDB } from "@/lib/db/mongoose";
import { DatabaseConfigError } from "@/lib/errors";
import { hashToken } from "@/lib/security/request";
import { isAdminRole, type AdminRole } from "@/lib/auth/permissions";
import { AdminSessionModel } from "@/models/admin-session";
import { UserModel } from "@/models/user";

export const SESSION_COOKIE = "velora_admin_session";
const SESSION_SECONDS = 60 * 60 * 12;

export type AdminPrincipal = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  sessionId: string;
  csrfToken: string;
};

function authSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim() ?? "";
  if (secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_SECONDS,
  };
}

export async function createAdminSession(user: { id: string; role: AdminRole }): Promise<{ token: string; csrfToken: string }> {
  await connectDB();
  const sid = randomBytes(32).toString("base64url");
  const csrfToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await AdminSessionModel.create({
    userId: user.id,
    tokenHash: hashToken(sid),
    csrfToken,
    expiresAt,
    revokedAt: null,
  });
  const token = await new SignJWT({ sid, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(authSecret());
  return { token, csrfToken };
}

export async function revokeSessionByToken(token: string | undefined): Promise<void> {
  if (!token) return;
  try {
    const { payload } = await jwtVerify(token, authSecret());
    const sid = typeof payload.sid === "string" ? payload.sid : "";
    if (!sid) return;
    await connectDB();
    await AdminSessionModel.updateOne({ tokenHash: hashToken(sid), revokedAt: null }, { revokedAt: new Date() });
  } catch (error) {
    if (error instanceof DatabaseConfigError) throw error;
  }
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await connectDB();
  await AdminSessionModel.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function serializeCookie(name: string, value: string, maxAge: number): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAge}`];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export async function readPrincipal(token: string | undefined): Promise<AdminPrincipal | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, authSecret());
    const sid = typeof payload.sid === "string" ? payload.sid : "";
    const sub = payload.sub ?? "";
    if (!sid || !sub) return null;
    await connectDB();
    const session = await AdminSessionModel.findOne({
      tokenHash: hashToken(sid),
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (!session || String(session.userId) !== sub) return null;
    const user = await UserModel.findById(sub).select("name email role status");
    if (!user || user.status !== "active" || !isAdminRole(user.role)) return null;
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      sessionId: String(session._id),
      csrfToken: session.csrfToken,
    };
  } catch (error) {
    if (error instanceof DatabaseConfigError) throw error;
    return null;
  }
}

export async function getSessionFromRequest(request: Request): Promise<AdminPrincipal | null> {
  return readPrincipal(readCookie(request, SESSION_COOKIE));
}

export async function getSession(): Promise<AdminPrincipal | null> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  return readPrincipal(jar.get(SESSION_COOKIE)?.value);
}
