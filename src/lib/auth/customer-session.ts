import { SignJWT, jwtVerify } from "jose";
import { connectDB } from "@/lib/db/mongoose";
import { DatabaseConfigError } from "@/lib/errors";
import { readCookie, serializeCookie, sessionCookieOptions } from "@/lib/auth/session";
import { CustomerModel } from "@/models/supporting";

export const CUSTOMER_SESSION_COOKIE = "velora_customer_session";
const CUSTOMER_SESSION_SECONDS = 60 * 60 * 24 * 30;

export type CustomerPrincipal = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  hasPassword: boolean;
};

function authSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim() ?? "";
  if (secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export function customerCookieOptions() {
  return { ...sessionCookieOptions(), maxAge: CUSTOMER_SESSION_SECONDS };
}

export async function createCustomerSessionToken(customerId: string): Promise<string> {
  return new SignJWT({ kind: "customer" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(customerId)
    .setIssuedAt()
    .setExpirationTime(`${CUSTOMER_SESSION_SECONDS}s`)
    .sign(authSecret());
}

export function appendCustomerSessionCookie(response: Response, token: string): void {
  response.headers.append("Set-Cookie", serializeCookie(CUSTOMER_SESSION_COOKIE, token, customerCookieOptions().maxAge));
}

export function clearCustomerSessionCookie(response: Response): void {
  response.headers.append("Set-Cookie", serializeCookie(CUSTOMER_SESSION_COOKIE, "", 0));
}

export async function readCustomerPrincipal(token: string | undefined): Promise<CustomerPrincipal | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, authSecret());
    if (payload.kind !== "customer") return null;
    const sub = payload.sub ?? "";
    if (!sub) return null;
    await connectDB();
    const customer = await CustomerModel.findById(sub).select("+passwordHash name mobile email");
    if (!customer) return null;
    return {
      id: String(customer._id),
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email ?? "",
      hasPassword: Boolean(customer.passwordHash),
    };
  } catch (error) {
    if (error instanceof DatabaseConfigError) throw error;
    return null;
  }
}

export async function getCustomerFromRequest(request: Request): Promise<CustomerPrincipal | null> {
  return readCustomerPrincipal(readCookie(request, CUSTOMER_SESSION_COOKIE));
}

export async function getCustomerSession(): Promise<CustomerPrincipal | null> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  return readCustomerPrincipal(jar.get(CUSTOMER_SESSION_COOKIE)?.value);
}
