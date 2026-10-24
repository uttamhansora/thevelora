import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id.");
export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens.").max(80);
export const skuSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9_-]{1,63}$/, "SKU must be 2–64 letters, numbers, hyphens, or underscores.");
export const paiseSchema = z.number().int().nonnegative().max(10_000_000_000);
export const emailSchema = z.string().trim().toLowerCase().email().max(160);
export const mobileSchema = z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number.");
export const pinSchema = z.string().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code.");

export function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    fieldErrors[key] ??= [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}
