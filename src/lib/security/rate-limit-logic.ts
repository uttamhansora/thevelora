export type RateWindow = { count: number; windowStart: number };

export function evaluateRateLimit(
  state: RateWindow | null,
  now: number,
  limit: number,
  windowMs: number,
): { allowed: boolean; next: RateWindow } {
  if (!state || now - state.windowStart >= windowMs) {
    return { allowed: true, next: { count: 1, windowStart: now } };
  }
  if (state.count >= limit) {
    return { allowed: false, next: state };
  }
  return { allowed: true, next: { count: state.count + 1, windowStart: state.windowStart } };
}
