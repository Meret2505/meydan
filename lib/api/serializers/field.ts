import type { Field } from "@prisma/client";
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
  surface: string;
  capacity: number;
  photo: string | null;
  favorite: boolean;
}

export function toFieldCardDto(
  field: Field,
  origin: string,
  favoriteIds: Set<string>,
): FieldCardDto {
  return {
    id: field.id,
    name: field.name,
    nameRu: field.nameRu,
    nameTm: field.nameTm,
    district: field.district,
    surface: field.surface,
    capacity: field.capacity,
    // Proxied + absolute so Coil can load it directly and Supabase-blocking
    // networks still get the image (see lib/api/images.ts).
    photo: absoluteImageUrl(field.image, origin),
    favorite: favoriteIds.has(field.id),
  };
}
