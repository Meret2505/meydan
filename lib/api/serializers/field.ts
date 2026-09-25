import type { Field, Surface } from "@prisma/client";
import { LEGACY_LABEL } from "@/lib/surface";
import { absoluteImageUrl } from "@/lib/api/images";

/**
 * A field as the mobile fields list renders it. Both localized names are sent
 * so the client resolves by its own locale (the web FieldItem does the same),
 * avoiding a locale round-trip on the list request.
 */
export interface FieldCardDto {
  id: string;
  name: string;
  nameRu: string | null;
  nameTm: string | null;
  district: string;
  /**
   * The Russian label the column used to hold. Installed builds filter the
   * catalogue client-side by comparing against this exact string, so it keeps
   * being sent until those builds are gone. New clients read [surfaceKey].
   */
  surface: string;
  surfaceKey: Surface;
  capacity: number;
  photo: string | null;
  favorite: boolean;
}

/** The columns a card needs — so the query may select just these. */
export type FieldCardRow = Pick<
  Field,
  "id" | "name" | "nameRu" | "nameTm" | "district" | "surface" | "capacity" | "image"
>;

export function toFieldCardDto(
  field: FieldCardRow,
  origin: string,
  favoriteIds: Set<string>,
): FieldCardDto {
  return {
    id: field.id,
    name: field.name,
    nameRu: field.nameRu,
    nameTm: field.nameTm,
    district: field.district,
    // `?? field.surface` so the deploy order does not matter: between the
    // migration and the code landing (in either order) this column may still
    // hold the Russian label, and Prisma hands it over as a plain string. The
    // fallback keeps both fields populated rather than emitting `undefined`,
    // which JSON drops — and a missing `surface` is a hard deserialization
    // failure on the client, reported there as "no connection".
    surface: LEGACY_LABEL[field.surface] ?? field.surface,
    surfaceKey: field.surface,
    capacity: field.capacity,
    // Proxied + absolute so Coil can load it directly and Supabase-blocking
    // networks still get the image (see lib/api/images.ts).
    photo: absoluteImageUrl(field.image, origin),
    favorite: favoriteIds.has(field.id),
  };
}
