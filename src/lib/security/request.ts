import { createHash, timingSafeEqual } from "crypto";

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim() ?? "";
    if (/^[0-9a-fA-F:.]{3,64}$/.test(first)) return first;
  }
  return "unknown";
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function timingSafeStringEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function assertTestDatabase(): void {
  const uri = process.env.MONGODB_URI ?? "";
  const name = process.env.MONGODB_DB_NAME ?? "";
  const local = uri.includes("127.0.0.1") || uri.includes("localhost");
  if (!name.endsWith("_test") || !local) {
    throw new Error("Refusing to run a database test outside a local *_test database.");
  }
}
