import { redactSecrets } from "@/lib/security/redact";

export function logError(context: string, error: unknown): void {
  const raw = error instanceof Error ? error.message : "Unknown error";
  console.error(`[velora] ${context}: ${redactSecrets(raw)}`);
}
