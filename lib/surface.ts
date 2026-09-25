import { Surface } from "@prisma/client";

/**
 * The pitch surface, and the Russian label it used to be stored as.
 *
 * The column held `"Искусственная трава"` — a *display string* as the domain
 * value. Three separate literal tables (this file's ancestor in lib/data.ts,
 * SURFACE_KEY in FieldsView.tsx, surfaceLabel in FieldsScreen.kt) had to match
 * it byte for byte, so copy-editing the Russian wording in one of them would
 * have silently dropped every language back to showing raw Russian. It is a
 * database enum now, and the label is a rendering concern again.
 *
 * [LEGACY_LABEL] is the compatibility half. Installed copies of the app filter
 * the catalogue client-side by comparing against that exact string, so the API
 * keeps sending it as `surface` while new clients read `surfaceKey`. The legacy
 * field goes when those builds are gone — not before.
 */

export const SURFACES = [Surface.ARTIFICIAL, Surface.RUBBER, Surface.DIRT] as const;

/** What the column used to contain, and what `surface` still carries on the wire. */
export const LEGACY_LABEL: Record<Surface, string> = {
  [Surface.ARTIFICIAL]: "Искусственная трава",
  [Surface.RUBBER]: "Резиновое",
  [Surface.DIRT]: "Грунт",
};

const BY_LEGACY_LABEL: Record<string, Surface> = Object.fromEntries(
  SURFACES.map((s) => [LEGACY_LABEL[s], s]),
);

/**
 * next-intl message key per surface, for the web.
 *
 * This table existed three times — fields/page.tsx, FieldsView.tsx,
 * FieldCard.tsx — each keyed by the Russian label, each a place the wording
 * had to be repeated exactly. Android's equivalent is surfaceLabel().
 */
export const SURFACE_MESSAGE_KEY: Record<Surface, string> = {
  [Surface.ARTIFICIAL]: "fields.surface_turf",
  [Surface.RUBBER]: "fields.surface_rubber",
  [Surface.DIRT]: "fields.surface_dirt",
};

/**
 * Reads either spelling: a key from a current client, or the Russian label an
 * older one sends. Null for anything else, so the caller rejects it rather
 * than storing a guess.
 */
export function toSurface(raw: string | null | undefined): Surface | null {
  if (!raw) return null;
  if ((SURFACES as readonly string[]).includes(raw)) return raw as Surface;
  return BY_LEGACY_LABEL[raw] ?? null;
}
