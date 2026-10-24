import { AppError } from "@/lib/errors";

function expectedOrigin(): string {
  const raw = process.env.APP_URL?.trim() || "http://localhost:3000";
  try {
    return new URL(raw).origin;
  } catch {
    return "http://localhost:3000";
  }
}

export function isAllowedOrigin(origin: string): boolean {
  const expected = expectedOrigin();
  if (origin === expected) return true;
  if (process.env.NODE_ENV === "production") return false;
  try {
    const incoming = new URL(origin);
    const allowed = new URL(expected);
    const localHosts = new Set(["localhost", "127.0.0.1"]);
    return localHosts.has(incoming.hostname) && localHosts.has(allowed.hostname) && incoming.port === allowed.port;
  } catch {
    return false;
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  if (!isAllowedOrigin(origin)) {
    throw new AppError("Request origin was rejected.", 403);
  }
}
