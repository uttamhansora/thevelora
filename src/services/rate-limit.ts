import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors";
import { evaluateRateLimit } from "@/lib/security/rate-limit-logic";
import { RateLimitModel } from "@/models/supporting";

const POLICIES = {
  login: { limit: 8, windowMs: 15 * 60 * 1000 },
  search: { limit: 60, windowMs: 60 * 1000 },
  order: { limit: 8, windowMs: 10 * 60 * 1000 },
  claim: { limit: 6, windowMs: 15 * 60 * 1000 },
  newsletter: { limit: 5, windowMs: 60 * 60 * 1000 },
  contact: { limit: 5, windowMs: 60 * 60 * 1000 },
  review: { limit: 6, windowMs: 60 * 60 * 1000 },
} as const;

export type RateScope = keyof typeof POLICIES;

export async function consumeRateLimit(scope: RateScope, key: string): Promise<void> {
  await connectDB();
  const policy = POLICIES[scope];
  const id = `${scope}:${key}`.slice(0, 180);
  const existing = await RateLimitModel.findOne({ key: id });
  const decision = evaluateRateLimit(
    existing ? { count: existing.count, windowStart: new Date(existing.windowStart).getTime() } : null,
    Date.now(),
    policy.limit,
    policy.windowMs,
  );
  if (!decision.allowed) throw new AppError("Too many requests. Please wait and try again.", 429);
  await RateLimitModel.updateOne(
    { key: id },
    { key: id, count: decision.next.count, windowStart: new Date(decision.next.windowStart) },
    { upsert: true },
  );
}
