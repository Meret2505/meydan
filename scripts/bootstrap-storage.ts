import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
  );
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const BUCKETS = [
  { name: "avatars", public: true },
  { name: "field-photos", public: true },
] as const;

const BUCKET_OPTS = {
  fileSizeLimit: 5 * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
};

async function main() {
  const { data: existing, error: listErr } = await sb.storage.listBuckets();
  if (listErr) {
    console.error("listBuckets failed:", listErr.message);
    process.exit(1);
  }
  const names = new Set((existing ?? []).map((b) => b.name));

  for (const b of BUCKETS) {
    if (names.has(b.name)) {
      const { error } = await sb.storage.updateBucket(b.name, {
        public: b.public,
        ...BUCKET_OPTS,
      });
      if (error) {
        console.warn(`! update ${b.name}: ${error.message}`);
      } else {
        console.log(`✓ ${b.name} already exists — settings updated`);
      }
      continue;
    }
    const { error } = await sb.storage.createBucket(b.name, {
      public: b.public,
      ...BUCKET_OPTS,
    });
    if (error) {
      console.error(`✗ create ${b.name}: ${error.message}`);
      process.exit(1);
    }
    console.log(`✓ created bucket ${b.name} (public)`);
  }

  console.log("\nStorage bootstrap complete.");
}

main();
