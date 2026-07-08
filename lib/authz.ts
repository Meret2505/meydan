import "server-only";

// Fields are a curated directory (seeded from a business listing) with no
// per-row owner, so field-photo mutation is gated to an explicit admin
// allowlist rather than "any logged-in user". Set ADMIN_USER_IDS to a
// comma-separated list of User.id values. Unset => no admins => fails closed.
const adminIds = new Set(
  (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

export function isAdmin(userId: string | null | undefined): boolean {
  return !!userId && adminIds.has(userId);
}
