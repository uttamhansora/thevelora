import { readCookie, revokeSessionByToken, serializeCookie, SESSION_COOKIE } from "@/lib/auth/session";
import { handleError, json } from "@/lib/http";
import { assertSameOrigin } from "@/lib/security/origin";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await revokeSessionByToken(readCookie(request, SESSION_COOKIE));
    const response = json({ ok: true });
    response.headers.append("Set-Cookie", serializeCookie(SESSION_COOKIE, "", 0));
    return response;
  } catch (error) {
    return handleError(error);
  }
}
