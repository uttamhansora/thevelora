export function sanitizeSearch(input: string): string {
  return input.replace(/[^\p{L}\p{N}\s\-_.]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parsePage(value: string | null | undefined, fallback = 1): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10_000) return fallback;
  return parsed;
}

export function parseLimit(value: string | null | undefined, fallback = 12, max = 48): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}
