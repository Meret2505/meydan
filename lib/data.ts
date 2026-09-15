import type { Position } from "@prisma/client";
import type { Locale } from "@/i18n";

export const POSITIONS: {
  value: Position;
  abbr: Record<Locale, string>;
  sub: Record<Locale, string>;
}[] = [
  {
    value: "GOALKEEPER",
    abbr: { ru: "ВР", tm: "DM", en: "GK" },
    sub: { ru: "Под штангой", tm: "Derwezede", en: "In goal" },
  },
  {
    value: "DEFENDER",
    abbr: { ru: "ЗАЩ", tm: "GR", en: "DEF" },
    sub: { ru: "Сзади", tm: "Yzda", en: "At the back" },
  },
  {
    value: "MIDFIELDER",
    abbr: { ru: "ПЗ", tm: "ÝG", en: "MID" },
    sub: { ru: "В центре", tm: "Merkezde", en: "In the middle" },
  },
  {
    value: "FORWARD",
    abbr: { ru: "НАП", tm: "HJ", en: "FWD" },
    sub: { ru: "Впереди", tm: "Öňde", en: "Up front" },
  },
];

export const DISTRICTS = [
  "Berzengi",
  "Choganly",
  "Parahat",
  "Anev",
  "Buzmeyin",
  "Köpetdag",
  "Bagtyýarlyk",
  "Bagyr",
];

export const AGE_RANGES = ["до 18", "18–24", "25–34", "35+"] as const;

// Canonical, in Russian — this is the exact string stored on Field.surface,
// not a translation key. The list/filter UI maps each value to a translated
// label (fields.surface_turf etc.); a field-submission form validates against
// this array directly.
export const SURFACES = ["Искусственная трава", "Резиновое", "Грунт"] as const;
