const URI_WITH_USERINFO = /mongodb(\+srv)?:\/\/[^@\s/]+@/gi;
const FULL_URI = /mongodb(\+srv)?:\/\/[^\s'"]+/gi;

export function redactSecrets(value: string): string {
  return value.replace(URI_WITH_USERINFO, "mongodb$1://[redacted]@").replace(FULL_URI, "mongodb$1://[redacted]");
}
