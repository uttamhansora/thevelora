import { existsSync, readFileSync } from "fs";

export function loadLocalEnv(): void {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator < 1) continue;
      const key = trimmed.slice(0, separator);
      if (process.env[key]) continue;
      process.env[key] = trimmed.slice(separator + 1).replace(/^"|"$/g, "");
    }
  }
}
