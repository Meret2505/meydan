import { config } from "dotenv";
import { tmpdir } from "os";
import { join } from "path";

// Tests read .env.test so they never touch the dev or production database.
// Committed as .env.test.example; copy it before running the suite.
config({ path: ".env.test", quiet: true });

// Deterministic secret for token signing/verification in tests. A real value
// is never needed here — the suite only checks round-trips against itself.
process.env.AUTH_SECRET ??= "test-secret-not-used-outside-tests";
process.env.NEXTAUTH_SECRET ??= process.env.AUTH_SECRET;

// Uploads go to a throwaway directory rather than Supabase, so the storage
// paths (put, remove, URL parsing) are exercised for real without credentials
// and without writing to a live bucket.
process.env.STORAGE_BACKEND ??= "local";
process.env.LOCAL_STORAGE_DIR ??= join(tmpdir(), "meydan-test-uploads");
process.env.PUBLIC_STORAGE_BASE_URL ??= "http://storage.test/uploads";

// Field photos are admin-gated by an env allowlist; give the suite an admin so
// those paths are reachable.
process.env.ADMIN_USER_IDS ??= "test-admin-user";
