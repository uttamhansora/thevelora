import { afterEach, describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { assertSameOrigin, isAllowedOrigin } from "@/lib/security/origin";

const originalAppUrl = process.env.APP_URL;
const originalNodeEnv = process.env.NODE_ENV;
const originalVercelUrl = process.env.VERCEL_URL;
const originalProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const originalBranchUrl = process.env.VERCEL_BRANCH_URL;

afterEach(() => {
  process.env.APP_URL = originalAppUrl;
  process.env.NODE_ENV = originalNodeEnv;
  if (originalVercelUrl === undefined) delete process.env.VERCEL_URL;
  else process.env.VERCEL_URL = originalVercelUrl;
  if (originalProductionUrl === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  else process.env.VERCEL_PROJECT_PRODUCTION_URL = originalProductionUrl;
  if (originalBranchUrl === undefined) delete process.env.VERCEL_BRANCH_URL;
  else process.env.VERCEL_BRANCH_URL = originalBranchUrl;
});

describe("same-origin checks", () => {
  it("allows the configured site and its www or apex twin in production", () => {
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "https://thevelora.website";
    expect(isAllowedOrigin("https://thevelora.website")).toBe(true);
    expect(isAllowedOrigin("https://www.thevelora.website")).toBe(true);
    expect(isAllowedOrigin("https://evil.example")).toBe(false);
  });

  it("allows the host that received the request when APP_URL is still localhost", () => {
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "http://localhost:3000";
    const request = new Request("https://www.thevelora.website/api/admin/login", {
      method: "POST",
      headers: {
        origin: "https://www.thevelora.website",
        "x-forwarded-host": "www.thevelora.website",
        "x-forwarded-proto": "https",
      },
    });
    expect(() => assertSameOrigin(request)).not.toThrow();
  });

  it("rejects a different site posting to the store", () => {
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "https://www.thevelora.website";
    const request = new Request("https://www.thevelora.website/api/admin/login", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "x-forwarded-host": "www.thevelora.website",
        "x-forwarded-proto": "https",
      },
    });
    expect(() => assertSameOrigin(request)).toThrow(AppError);
    try {
      assertSameOrigin(request);
    } catch (error) {
      expect(error).toMatchObject({ message: "Request origin was rejected.", status: 403 });
    }
  });
});
