export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export type ImageKind = "jpeg" | "png" | "webp" | "gif";

const MIME_BY_KIND: Record<ImageKind, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export function detectImageType(buffer: Uint8Array): ImageKind | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "png";
  const riff = String.fromCharCode(buffer[0]!, buffer[1]!, buffer[2]!, buffer[3]!);
  const webp = String.fromCharCode(buffer[8]!, buffer[9]!, buffer[10]!, buffer[11]!);
  if (riff === "RIFF" && webp === "WEBP") return "webp";
  const gif = String.fromCharCode(buffer[0]!, buffer[1]!, buffer[2]!, buffer[3]!, buffer[4]!, buffer[5]!);
  if (gif === "GIF87a" || gif === "GIF89a") return "gif";
  return null;
}

export function mimeForKind(kind: ImageKind): string {
  return MIME_BY_KIND[kind];
}

export function extensionForKind(kind: ImageKind): string {
  return kind === "jpeg" ? "jpg" : kind;
}

export function readImageSize(buffer: Uint8Array, kind: ImageKind): { width: number; height: number } | null {
  try {
    if (kind === "png" && buffer.length >= 24) {
      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      return { width: view.getUint32(16), height: view.getUint32(20) };
    }
    if (kind === "gif" && buffer.length >= 10) {
      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
    }
    if (kind === "jpeg") {
      let offset = 2;
      while (offset + 8 < buffer.length) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1]!;
        const size = (buffer[offset + 2]! << 8) + buffer[offset + 3]!;
        if (marker >= 0xc0 && marker <= 0xc3 && offset + 9 < buffer.length) {
          const height = (buffer[offset + 5]! << 8) + buffer[offset + 6]!;
          const width = (buffer[offset + 7]! << 8) + buffer[offset + 8]!;
          return { width, height };
        }
        if (size < 2) break;
        offset += 2 + size;
      }
    }
  } catch {
    return null;
  }
  return null;
}

const ALLOWED_DECLARED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

export function validateImageUpload(buffer: Uint8Array, declaredMime: string): {
  kind: ImageKind;
  mime: string;
  width: number | null;
  height: number | null;
} {
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Image must be between 1 byte and 5 MB.");
  }
  const normalized = declaredMime.toLowerCase().split(";")[0]?.trim() ?? "";
  if (!ALLOWED_DECLARED.has(normalized)) {
    throw new Error("Only JPEG, PNG, WEBP, and GIF images are allowed.");
  }
  const kind = detectImageType(buffer);
  if (!kind) throw new Error("The file content is not a supported image.");
  const expected = mimeForKind(kind);
  if (normalized !== expected && !(normalized === "image/jpg" && kind === "jpeg")) {
    throw new Error("The file content does not match its declared type.");
  }
  const size = readImageSize(buffer, kind);
  return { kind, mime: expected, width: size?.width ?? null, height: size?.height ?? null };
}
