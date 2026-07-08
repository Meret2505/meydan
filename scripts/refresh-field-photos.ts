/**
 * refresh-field-photos.ts
 *
 * For each Field whose `photos` array contains scraped yakyn.biz URLs (or any
 * previously-imported source), fetch the current image, apply a deterministic
 * per-field transformation, upload the result to Supabase Storage under the
 * `field-photos` bucket, then rewrite the DB row so the field points at the
 * refreshed URL.
 *
 * Deterministic on field id — running twice produces the same output and
 * overwrites the existing object in place (upsert:true).
 *
 * Usage:
 *   npx tsx scripts/refresh-field-photos.ts [--dry] [--only <fieldId>]
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();
import { createHash } from "crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const args = process.argv.slice(2);
const isDry = args.includes("--dry");
const onlyIdx = args.indexOf("--only");
const onlyField = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

// Four transform recipes. Deterministic pick per field id so the same field
// always resolves to the same variant — makes reruns idempotent and the pack
// of fields looks intentionally varied instead of randomly stirred.
const RECIPES = [
  // A: mirror + warmth boost, center-crop 4:3
  { angle: 0, flip: true, saturation: 1.15, brightness: 1.05, hueRotate: 0 },
  // B: subtle 3° tilt with re-crop, cooler
  { angle: 3, flip: false, saturation: 1.08, brightness: 1.02, hueRotate: -6 },
  // C: -4° tilt + mirror, punchier greens
  { angle: -4, flip: true, saturation: 1.22, brightness: 1.03, hueRotate: 4 },
  // D: zoom-crop, neutral grade
  { angle: 0, flip: false, saturation: 1.1, brightness: 1.04, hueRotate: 0, zoom: 1.18 },
];

function pickRecipe(fieldId: string) {
  const h = createHash("sha1").update(fieldId).digest();
  return RECIPES[h[0] % RECIPES.length];
}

// Route yakyn.biz photos through our own /api/storage/yakyn proxy running on
// the local dev server. The proxy handles the upstream fetch server-side, so
// we get a plain HTTPS response with proper cert handling instead of hitting
// yakyn.biz:8000 directly (which fails TLS verification in Node's fetch).
const LOCAL_PROXY = process.env.LOCAL_PROXY_BASE ?? "http://localhost:3000";

function proxied(url: string): string {
  const yakyn = url.match(/yakyn\.biz[:/][0-9]*\/?(.*)/);
  if (yakyn) return `${LOCAL_PROXY}/api/storage/yakyn/${yakyn[1]}`;
  return url;
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const target = proxied(url);
  const res = await fetch(target);
  if (!res.ok) throw new Error(`fetch ${target} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

type Recipe = ReturnType<typeof pickRecipe>;

async function transform(source: Buffer, recipe: Recipe): Promise<Buffer> {
  let img = sharp(source, { failOn: "none" });
  const meta = await img.metadata();
  const srcW = meta.width ?? 1200;
  const srcH = meta.height ?? 800;

  if (recipe.angle) {
    // Rotate then trim the diagonal white/black corners.
    img = img.rotate(recipe.angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  }
  if (recipe.flip) {
    img = img.flop(); // horizontal mirror
  }

  // Re-crop to a clean 4:3 landscape, biasing to the center so rotated
  // corner artifacts land outside the visible frame.
  const rotated = await img.png().toBuffer();
  img = sharp(rotated);
  const m2 = await img.metadata();
  const w = m2.width ?? srcW;
  const h = m2.height ?? srcH;
  const targetAspect = 4 / 3;
  let cropW = w;
  let cropH = Math.round(w / targetAspect);
  if (cropH > h) {
    cropH = h;
    cropW = Math.round(h * targetAspect);
  }
  // Trim a further 6% off each edge to hide any leftover rotation gutters.
  const trim = recipe.angle ? 0.06 : 0;
  const zoomFactor = recipe.zoom ?? 1;
  const usableW = Math.round((cropW * (1 - trim)) / zoomFactor);
  const usableH = Math.round((cropH * (1 - trim)) / zoomFactor);
  const left = Math.max(0, Math.round((w - usableW) / 2));
  const top = Math.max(0, Math.round((h - usableH) / 2));
  img = img.extract({ left, top, width: usableW, height: usableH });

  img = img.modulate({
    saturation: recipe.saturation,
    brightness: recipe.brightness,
    hue: recipe.hueRotate,
  });

  return img
    .resize(1200, 900, { fit: "cover" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

async function run() {
  const fields = await prisma.field.findMany({
    where: { photos: { isEmpty: false } },
    select: { id: true, name: true, photos: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${fields.length} fields with photos`);
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const f of fields) {
    if (onlyField && f.id !== onlyField) continue;
    const primary = f.photos[0];
    if (!primary) {
      skipped++;
      continue;
    }
    const recipe = pickRecipe(f.id);
    const recipeLetter = ["A", "B", "C", "D"][RECIPES.indexOf(recipe)];
    process.stdout.write(
      `[${recipeLetter}] ${f.name.slice(0, 42).padEnd(42)} `,
    );
    try {
      const src = await fetchBuffer(primary);
      const out = await transform(src, recipe);
      const path = `refresh/${f.id}.jpg`;
      if (isDry) {
        console.log(`dry-run → would upload ${out.byteLength}B to ${path}`);
      } else {
        const { error } = await sb.storage
          .from("field-photos")
          .upload(path, out, { contentType: "image/jpeg", upsert: true });
        if (error) throw new Error(`upload: ${error.message}`);
        const { data } = sb.storage.from("field-photos").getPublicUrl(path);
        const newUrl = data.publicUrl;
        // Replace the first photo with the refreshed URL. Keep any additional
        // photos (uploads from users) untouched.
        const nextPhotos = [newUrl, ...f.photos.slice(1)];
        await prisma.field.update({
          where: { id: f.id },
          data: { photos: nextPhotos, image: newUrl },
        });
        console.log(`ok → ${out.byteLength} bytes`);
      }
      ok++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`fail (${msg})`);
      failed++;
    }
  }

  console.log(`\ndone — ok:${ok} skipped:${skipped} failed:${failed}`);
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
