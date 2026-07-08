/**
 * regen-field-photos.ts
 *
 * For each Field, sends the current photo to Google Gemini (Nano Banana:
 * `gemini-2.5-flash-image-preview`) as a reference image plus a per-field
 * prompt, then uploads the generated variant to Supabase and rewrites the
 * DB row so the field shows the new image.
 *
 * Prompts rotate across a pool (golden hour, blue hour, drone, low angle,
 * morning fog, evening lights, wide, tight, backlit) picked deterministically
 * from the field id so the same field always resolves to the same look.
 *
 * Usage:
 *   npx tsx scripts/regen-field-photos.ts --only <fieldId>   # single field, safe first run
 *   npx tsx scripts/regen-field-photos.ts                    # all fields
 *   npx tsx scripts/regen-field-photos.ts --dry              # skip upload + DB
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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const args = process.argv.slice(2);
const isDry = args.includes("--dry");
const onlyIdx = args.indexOf("--only");
const onlyField = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

// Per-field prompt pool. Each entry is a distinct time-of-day / angle / mood so
// no two fields feel like the same photo. Prompts explicitly ask Gemini to keep
// the pitch geometry so viewers can still recognise the field.
const PROMPTS = [
  "Photorealistic photo of the same football pitch during golden hour. Warm low sun casting long shadows across the turf. Wide angle at ground level from behind one goal, showing the full field. Keep the pitch layout, fencing, and surroundings recognisable.",
  "Photorealistic photo of the same football pitch under blue hour after sunset. Deep blue sky, stadium floodlights just turning on with slight bloom. Elevated three-quarter angle. Same layout, same fencing, same buildings.",
  "Photorealistic photo of the same football pitch shot from a low drone about 6 metres above midfield, looking toward the opposite goal. Bright overcast daylight, no harsh shadows. Preserve pitch markings and the surrounding buildings.",
  "Photorealistic photo of the same football pitch in early morning, thin mist rolling over the turf, soft cool light, dew shine on the grass. Ground-level angle from a corner. Same pitch geometry.",
  "Photorealistic photo of the same football pitch under full stadium floodlights at night. Bright artificial light on the turf, dark sky, subtle lens flares from the lamp posts. Wide angle from behind the goal. Keep fencing and buildings identical.",
  "Photorealistic photo of the same football pitch on a bright clear day, mid-afternoon. Slight elevated angle from a corner tribune. Vivid green turf, high-contrast markings. Keep the layout and surrounding buildings recognisable.",
];

function pickPrompt(fieldId: string): { prompt: string; label: string } {
  const h = createHash("sha1").update(fieldId).digest();
  const idx = h[0] % PROMPTS.length;
  const labels = ["golden", "blue-hr", "drone", "misty", "floodlit", "clear"];
  return { prompt: PROMPTS[idx], label: labels[idx] };
}

const LOCAL_PROXY = process.env.LOCAL_PROXY_BASE ?? "http://localhost:3000";
function proxied(url: string): string {
  const y = url.match(/yakyn\.biz[:/][0-9]*\/?(.*)/);
  if (y) return `${LOCAL_PROXY}/api/storage/yakyn/${y[1]}`;
  return url;
}

async function fetchBuffer(url: string): Promise<{ buffer: Buffer; mime: string }> {
  const target = proxied(url);
  const res = await fetch(target);
  if (!res.ok) throw new Error(`fetch ${target} → ${res.status}`);
  const raw = Buffer.from(await res.arrayBuffer());
  // Downscale the reference to keep the base64 payload small — Gemini's free
  // tier caps input tokens per minute and full-res images blow past that.
  // 512 px wide is more than enough for the model to read the composition.
  const buffer = await sharp(raw, { failOn: "none" })
    .resize(512, 384, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();
  return { buffer, mime: "image/jpeg" };
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callGemini(
  refBuf: Buffer,
  refMime: string,
  prompt: string,
): Promise<Buffer> {
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-image";
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` +
    encodeURIComponent(GEMINI_API_KEY!);
  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: refMime,
              data: refBuf.toString("base64"),
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
      temperature: 0.85,
    },
  };
  // Retry with backoff on 429 (free-tier per-minute quota) so a batch of 19
  // fields drains through without manual re-runs.
  let res: Response | null = null;
  let raw = "";
  for (let attempt = 0; attempt < 6; attempt++) {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    raw = await res.text();
    if (res.status !== 429) break;
    const backoff = Math.min(65_000, 8_000 * Math.pow(1.6, attempt));
    process.stdout.write(`[429, waiting ${Math.round(backoff / 1000)}s] `);
    await sleep(backoff);
  }
  if (!res || !res.ok) throw new Error(`gemini ${res?.status}: ${raw.slice(0, 400)}`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`gemini bad JSON: ${raw.slice(0, 200)}`);
  }
  // deno-lint-ignore no-explicit-any
  const p = parsed as any;
  const parts = p?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const data = part?.inline_data?.data ?? part?.inlineData?.data;
    if (data) return Buffer.from(data, "base64");
  }
  throw new Error(`gemini: no image in response — ${raw.slice(0, 300)}`);
}

async function run() {
  const fields = await prisma.field.findMany({
    where: { photos: { isEmpty: false } },
    select: { id: true, name: true, photos: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${fields.length} fields with photos`);
  let ok = 0;
  let failed = 0;

  for (const f of fields) {
    if (onlyField && f.id !== onlyField) continue;
    const primary = f.photos[0];
    if (!primary) continue;
    const { prompt, label } = pickPrompt(f.id);
    process.stdout.write(
      `[${label.padEnd(8)}] ${f.name.slice(0, 40).padEnd(40)} `,
    );
    try {
      const { buffer: srcBuf, mime } = await fetchBuffer(primary);
      const genBuf = await callGemini(srcBuf, mime, prompt);
      const path = `regen/${f.id}.png`;
      if (isDry) {
        console.log(`dry → would upload ${genBuf.byteLength}B to ${path}`);
      } else {
        const { error } = await sb.storage
          .from("field-photos")
          .upload(path, genBuf, { contentType: "image/png", upsert: true });
        if (error) throw new Error(`upload: ${error.message}`);
        const { data } = sb.storage.from("field-photos").getPublicUrl(path);
        const newUrl = data.publicUrl;
        const nextPhotos = [newUrl, ...f.photos.slice(1)];
        await prisma.field.update({
          where: { id: f.id },
          data: { photos: nextPhotos, image: newUrl },
        });
        console.log(`ok → ${genBuf.byteLength} bytes`);
      }
      ok++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`fail (${msg})`);
      failed++;
      if (onlyField) throw e; // fail loud in single-field probe mode
    }
  }
  console.log(`\ndone — ok:${ok} failed:${failed}`);
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
