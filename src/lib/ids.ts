import { randomBytes } from "crypto";

export function createOrderNumber(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const rand = randomBytes(8).toString("hex").toUpperCase();
  return `VEL-${year}${month}${day}-${rand}`;
}

export function createPublicToken(): string {
  return randomBytes(32).toString("base64url");
}

export function createIdempotencyKey(): string {
  return randomBytes(16).toString("hex");
}
