import { AppError } from "@/lib/errors";

function parseOrigin(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  const value = raw.trim();
  try {
    return new URL(/^[a-z][a-z\d+\-.]*:\/\//i.test(value) ? value : `https://${value}`).origin;
  } catch {
    return null;
  }
}

function withWwwVariant(origin: string): string[] {
  try {
    const url = new URL(origin);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname.endsWith(".vercel.app")) {
      return [origin];
    }
    const sibling = new URL(origin);
    sibling.hostname = url.hostname.startsWith("www.") ? url.hostname.slice(4) : `www.${url.hostname}`;
    return [origin, sibling.origin];
  } catch {
    return [origin];
  }
}

function configuredOrigins(): string[] {
  const origins = [
    process.env.APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
  ].flatMap((value) => {
    const origin = parseOrigin(value);
    return origin ? withWwwVariant(origin) : [];
  });
  return origins.length > 0 ? origins : ["http://localhost:3000"];
}

function requestOrigins(request: Request): string[] {
  const hosts = [request.headers.get("x-forwarded-host"), request.headers.get("host")].flatMap((value) =>
    value ? value.split(",").map((part) => part.trim()).filter(Boolean) : [],
  );
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return hosts.flatMap((host) => {
    const proto =
      forwardedProto === "https" || forwardedProto === "http"
        ? forwardedProto
        : host.startsWith("localhost") || host.startsWith("127.0.0.1")
          ? "http"
          : "https";
    const origin = parseOrigin(`${proto}://${host}`);
    return origin ? [origin] : [];
  });
}

export function isAllowedOrigin(origin: string, request?: Request): boolean {
  if (configuredOrigins().includes(origin)) return true;
  if (request && requestOrigins(request).includes(origin)) return true;
  if (process.env.NODE_ENV === "production") return false;
  try {
    const incoming = new URL(origin);
    const allowed = new URL(configuredOrigins()[0] ?? "http://localhost:3000");
    const localHosts = new Set(["localhost", "127.0.0.1"]);
    return localHosts.has(incoming.hostname) && localHosts.has(allowed.hostname) && incoming.port === allowed.port;
  } catch {
    return false;
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  if (!isAllowedOrigin(origin, request)) {
    throw new AppError("Request origin was rejected.", 403);
  }
}
