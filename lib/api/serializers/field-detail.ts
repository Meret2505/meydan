import type { Field, Surface } from "@prisma/client";
import { absoluteImageUrl } from "@/lib/api/images";
import { LEGACY_LABEL } from "@/lib/surface";
import {
  DAY_KEYS,
  parseAttributes,
  parseContacts,
  parseHours,
  type Contact,
} from "@/lib/field-metadata";

/**
 * Full field detail for the mobile field page. The JSON columns (hours,
 * attributes, contacts) are validated into typed shapes here — they are
 * hand-edited in the database, so a cast would not be enough; see
 * lib/field-metadata.ts — and localized name/address/body are sent as pairs
 * for the client to resolve by locale.
 */

export interface FieldDetailDto {
  id: string;
  name: string;
  nameRu: string | null;
  nameTm: string | null;
  address: string;
  addressRu: string | null;
  addressTm: string | null;
  district: string;
  /**
   * The Russian label the column used to hold. Installed builds filter the
   * catalogue client-side by comparing against this exact string, so it keeps
   * being sent until those builds are gone. New clients read [surfaceKey].
   */
  surface: string;
  surfaceKey: Surface;
  capacity: number;
  gamesPlayed: number;
  bodyRu: string | null;
  bodyTm: string | null;
  photos: string[];
  hours: { day: string; isOpen: boolean; start: string; end: string }[] | null;
  amenities: { ru: string; tm: string }[];
  contacts: Contact[];
}

type FieldWithCount = Field & { _count: { games: number } };

export function toFieldDetailDto(field: FieldWithCount, origin: string): FieldDetailDto {
  const parsedHours = parseHours(field.hours);
  const hours = parsedHours
    ? DAY_KEYS.map((day) => ({ day, ...parsedHours[day] }))
    : null;

  const attributes = parseAttributes(field.attributes);
  const contacts = parseContacts(field.contacts);

  return {
    id: field.id,
    name: field.name,
    nameRu: field.nameRu,
    nameTm: field.nameTm,
    address: field.address,
    addressRu: field.addressRu,
    addressTm: field.addressTm,
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
    gamesPlayed: field._count.games,
    bodyRu: field.bodyRu,
    bodyTm: field.bodyTm,
    // Proxied + absolute so Coil loads them on Supabase-blocked networks.
    photos: field.photos
      .map((p) => absoluteImageUrl(p, origin))
      .filter((p): p is string => p !== null),
    hours,
    amenities: attributes.map((a) => ({ ru: a.ru, tm: a.tm })),
    contacts,
  };
}
