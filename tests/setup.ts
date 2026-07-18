import { config } from "dotenv";

// Tests read .env.test so they never touch the dev or production database.
// Committed as .env.test.example; copy it before running the suite.
config({ path: ".env.test", quiet: true });

// Deterministic secret for token signing/verification in tests. A real value
// is never needed here — the suite only checks round-trips against itself.
process.env.AUTH_SECRET ??= "test-secret-not-used-outside-tests";
process.env.NEXTAUTH_SECRET ??= process.env.AUTH_SECRET;
