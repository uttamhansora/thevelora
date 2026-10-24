import { randomBytes } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { AppError } from "@/lib/errors";
import { extensionForKind, validateImageUpload } from "@/lib/images/magic";

const SAFE_NAME = /^[a-f0-9]{32}\.(jpg|png|webp|gif)$/;

function uploadsDir(): string {
  return path.resolve(process.cwd(), "data", "uploads");
}

function cloudinaryConfigured(): boolean {
  return (
    process.env.IMAGE_PROVIDER?.trim().toLowerCase() === "cloudinary" &&
    Boolean(process.env.IMAGE_PROVIDER_ACCOUNT && process.env.IMAGE_PROVIDER_KEY && process.env.IMAGE_PROVIDER_SECRET)
  );
}

export function imageStorageStatus(): { mode: "cloudinary" | "local" | "unconfigured"; message: string } {
  if (cloudinaryConfigured()) {
    return { mode: "cloudinary", message: "Uploads are stored with Cloudinary." };
  }
  if (process.env.NODE_ENV !== "production") {
    return {
      mode: "local",
      message: "Cloudinary credentials are not set. Development uploads are stored on this machine under data/uploads and served by /api/media.",
    };
  }
  return {
    mode: "unconfigured",
    message: "Set IMAGE_PROVIDER=cloudinary plus IMAGE_PROVIDER_ACCOUNT, IMAGE_PROVIDER_KEY, and IMAGE_PROVIDER_SECRET before uploading in production.",
  };
}

async function uploadCloudinary(bytes: Uint8Array, publicId: string, width: number | null, height: number | null) {
  const { v2 } = await import("cloudinary");
  v2.config({
    cloud_name: process.env.IMAGE_PROVIDER_ACCOUNT,
    api_key: process.env.IMAGE_PROVIDER_KEY,
    api_secret: process.env.IMAGE_PROVIDER_SECRET,
    secure: true,
  });
  const uploaded = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = v2.uploader.upload_stream(
      { folder: "thevelora", public_id: publicId, resource_type: "image", overwrite: false, unique_filename: false },
      (error, result) => {
        if (error || !result) reject(error ?? new Error("Image upload failed."));
        else resolve({ secure_url: result.secure_url, public_id: result.public_id });
      },
    );
    stream.end(Buffer.from(bytes));
  });
  return { url: uploaded.secure_url, publicId: uploaded.public_id, width, height, alt: "" };
}

export async function storeImage(file: File): Promise<{ url: string; publicId: string; width: number | null; height: number | null; alt: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let validated: ReturnType<typeof validateImageUpload>;
  try {
    validated = validateImageUpload(bytes, file.type || "application/octet-stream");
  } catch (error) {
    throw new AppError(error instanceof Error ? error.message : "Invalid image.", 400);
  }
  const stem = randomBytes(16).toString("hex");
  if (cloudinaryConfigured()) {
    return uploadCloudinary(bytes, stem, validated.width, validated.height);
  }
  const status = imageStorageStatus();
  if (status.mode !== "local") throw new AppError(status.message, 503);
  const filename = `${stem}.${extensionForKind(validated.kind)}`;
  const root = uploadsDir();
  await mkdir(root, { recursive: true });
  const target = path.resolve(root, filename);
  if (!target.startsWith(root)) throw new AppError("Invalid upload path.", 400);
  await writeFile(target, bytes);
  return { url: `/api/media/${filename}`, publicId: `local:${filename}`, width: validated.width, height: validated.height, alt: "" };
}

export async function readLocalImage(name: string): Promise<{ bytes: Buffer; mime: string } | null> {
  if (!SAFE_NAME.test(name)) return null;
  const root = uploadsDir();
  const target = path.resolve(root, name);
  if (!target.startsWith(root + path.sep)) return null;
  try {
    const bytes = await readFile(target);
    const mime = name.endsWith(".png") ? "image/png" : name.endsWith(".webp") ? "image/webp" : name.endsWith(".gif") ? "image/gif" : "image/jpeg";
    return { bytes, mime };
  } catch {
    return null;
  }
}

export async function deleteStoredImage(publicId: string): Promise<void> {
  if (!publicId) return;
  if (publicId.startsWith("local:")) {
    const filename = publicId.slice("local:".length);
    if (!SAFE_NAME.test(filename)) return;
    const root = uploadsDir();
    const target = path.resolve(root, filename);
    if (!target.startsWith(root + path.sep)) return;
    await unlink(target).catch(() => undefined);
    return;
  }
  if (!publicId.startsWith("thevelora/") || !cloudinaryConfigured()) return;
  const { v2 } = await import("cloudinary");
  v2.config({
    cloud_name: process.env.IMAGE_PROVIDER_ACCOUNT,
    api_key: process.env.IMAGE_PROVIDER_KEY,
    api_secret: process.env.IMAGE_PROVIDER_SECRET,
    secure: true,
  });
  await v2.uploader.destroy(publicId, { resource_type: "image" });
}
