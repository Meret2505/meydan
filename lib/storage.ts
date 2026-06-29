// Storage abstraction. Two backends:
//   - "supabase" (default): keeps the legacy Supabase Storage URLs working.
//   - "local": writes to LOCAL_STORAGE_DIR and serves via nginx at
//             PUBLIC_STORAGE_BASE_URL/<bucket>/<path>.
//
// The same API works for both so app code never branches on backend.

import { promises as fs } from "fs";
import { dirname, join } from "path";

export type Bucket = "avatars" | "field-photos";

interface StoragePort {
  put(bucket: Bucket, path: string, body: Buffer, mime: string): Promise<string>;
  remove(bucket: Bucket, path: string): Promise<void>;
}

const backend = (process.env.STORAGE_BACKEND ?? "supabase").toLowerCase();

class SupabaseStorage implements StoragePort {
  async put(bucket: Bucket, path: string, body: Buffer, mime: string) {
    const { supabaseAdmin } = await import("@/lib/supabase");
    const sb = supabaseAdmin();
    const { error } = await sb.storage
      .from(bucket)
      .upload(path, body, { contentType: mime, upsert: true });
    if (error) throw new Error(`supabase upload: ${error.message}`);
    const {
      data: { publicUrl },
    } = sb.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  }

  async remove(bucket: Bucket, path: string) {
    const { supabaseAdmin } = await import("@/lib/supabase");
    const sb = supabaseAdmin();
    await sb.storage.from(bucket).remove([path]);
  }
}

class LocalStorage implements StoragePort {
  private root = process.env.LOCAL_STORAGE_DIR ?? "/app/uploads";
  private baseUrl =
    process.env.PUBLIC_STORAGE_BASE_URL?.replace(/\/+$/, "") ?? "/uploads";

  async put(bucket: Bucket, path: string, body: Buffer, _mime: string) {
    const filePath = join(this.root, bucket, path);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
    return `${this.baseUrl}/${bucket}/${path}`;
  }

  async remove(bucket: Bucket, path: string) {
    const filePath = join(this.root, bucket, path);
    await fs.unlink(filePath).catch(() => {});
  }
}

const impl: StoragePort =
  backend === "local" ? new LocalStorage() : new SupabaseStorage();

export const storage = impl;

/**
 * Parses a stored object URL back into (bucket, path) so we can delete it.
 * Works for both backends — Supabase URLs include `/storage/v1/object/public/<bucket>/<path>`,
 * local URLs include `/<base>/<bucket>/<path>`.
 */
export function parseObjectUrl(
  url: string,
): { bucket: Bucket; path: string } | null {
  const buckets: Bucket[] = ["avatars", "field-photos"];
  for (const b of buckets) {
    const marker = `/${b}/`;
    const idx = url.indexOf(marker);
    if (idx !== -1) return { bucket: b, path: url.slice(idx + marker.length) };
  }
  return null;
}
