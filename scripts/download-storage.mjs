// Downloads every object from every public Supabase Storage bucket into
// backups/storage/<bucket>/<path>. Run before the VPS migration so we
// can re-upload to local filesystem storage.
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync, statSync } from "fs";
import { dirname, join } from "path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });
const OUT = "backups/storage";

async function listAll(bucket, prefix = "") {
  const all = [];
  let offset = 0;
  const limit = 1000;
  // Supabase list() returns 100 by default; paginate.
  for (;;) {
    const { data, error } = await sb.storage
      .from(bucket)
      .list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    if (!data?.length) break;
    for (const item of data) {
      // Folders have no id (or have a null mimetype)
      if (!item.id) {
        // recurse into subfolder
        const sub = await listAll(bucket, prefix ? `${prefix}/${item.name}` : item.name);
        all.push(...sub);
      } else {
        all.push(prefix ? `${prefix}/${item.name}` : item.name);
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return all;
}

async function main() {
  const { data: buckets, error } = await sb.storage.listBuckets();
  if (error) {
    console.error("listBuckets failed:", error.message);
    process.exit(1);
  }
  console.log(`Found ${buckets.length} bucket(s):`, buckets.map((b) => b.name).join(", "));

  let totalFiles = 0;
  let totalBytes = 0;
  for (const b of buckets) {
    console.log(`\n--- bucket: ${b.name} ---`);
    const paths = await listAll(b.name);
    console.log(`  ${paths.length} object(s)`);
    for (const p of paths) {
      const { data, error } = await sb.storage.from(b.name).download(p);
      if (error || !data) {
        console.error(`  ✗ ${p}: ${error?.message ?? "no data"}`);
        continue;
      }
      const buf = Buffer.from(await data.arrayBuffer());
      const outPath = join(OUT, b.name, p);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, buf);
      totalFiles++;
      totalBytes += buf.length;
      console.log(`  ✓ ${p} (${buf.length} bytes)`);
    }
  }
  console.log(`\nDone: ${totalFiles} files, ${(totalBytes / 1024).toFixed(1)} KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
