// Small parsers that reject junk instead of letting NaN / out-of-range values
// reach Prisma (where a NaN Int throws, and a negative score/age persists).

/** Parse a bounded non-negative integer, or null if invalid/out of range. */
export function parseBoundedInt(
  raw: string,
  min: number,
  max: number,
): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

/** Age: 10–100, or null when blank/invalid. */
export function parseAge(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return parseBoundedInt(trimmed, 10, 100);
}

/** Match score: 0–999. */
export function parseScore(raw: string): number | null {
  return parseBoundedInt(raw, 0, 999);
}
