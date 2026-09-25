import type { Field } from "@prisma/client";
import { absoluteImageUrl } from "@/lib/api/images";
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
  surface: string;
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
    surface: field.surface,
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
