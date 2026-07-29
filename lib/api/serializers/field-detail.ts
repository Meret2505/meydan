import type { Field } from "@prisma/client";
import { absoluteImageUrl } from "@/lib/api/images";

/**
 * Full field detail for the mobile field page. The JSON columns (hours,
 * attributes, contacts) are parsed into typed shapes here so the client never
 * deals with raw JsonValue, and localized name/address/body are sent as pairs
 * for the client to resolve by locale.
 */

type Contact = { type: "phone" | "instagram" | "tiktok"; value: string };
type Attribute = { code: number; tm: string; ru: string };
type DayHours = { isOpen: boolean; start: string; end: string };

const DAY_KEYS = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
] as const;

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
  const rawHours = field.hours as Record<string, DayHours> | null;
  const hours = rawHours
    ? DAY_KEYS.map((day) => ({
        day,
        isOpen: rawHours[day]?.isOpen ?? false,
        start: rawHours[day]?.start ?? "",
        end: rawHours[day]?.end ?? "",
      }))
    : null;

  const attributes = (field.attributes as Attribute[] | null) ?? [];
  const contacts = (field.contacts as Contact[] | null) ?? [];

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
