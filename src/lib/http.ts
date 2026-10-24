import { ZodError } from "zod";
import { AppError, DatabaseConfigError } from "@/lib/errors";
import { logError } from "@/lib/log";
import { zodFieldErrors } from "@/lib/validation/common";

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function handleError(error: unknown): Response {
  if (error instanceof ZodError) {
    return json({ error: "Please check the form.", fieldErrors: zodFieldErrors(error) }, 400);
  }
  if (error instanceof AppError) {
    return json({ error: error.message, details: error.details ?? undefined }, error.status);
  }
  if (error instanceof DatabaseConfigError) {
    return json({ error: error.message }, 503);
  }
  logError("request", error);
  return json({ error: "Something went wrong. Please try again." }, 500);
}

export async function readJson(request: Request, maxBytes = 1_000_000): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > maxBytes) {
    throw new AppError("Request is too large.", 413);
  }
  const text = await request.text();
  if (text.length > maxBytes) throw new AppError("Request is too large.", 413);
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AppError("Request body must be JSON.", 400);
  }
}
