// Single source of truth for phone normalization. Turkmen mobile numbers are
// 8 local digits (optionally prefixed with the 993 country code). Anything that
// doesn't match returns null so callers reject it instead of persisting junk.
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 8) return `+993${digits}`;
  if (digits.length === 11 && digits.startsWith("993")) return `+${digits}`;
  return null;
}
