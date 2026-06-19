import type { Position } from "@prisma/client";

export const POSITIONS: {
  value: Position;
  abbr: { ru: string; tm: string };
  sub: { ru: string; tm: string };
}[] = [
  {
    value: "GOALKEEPER",
    abbr: { ru: "ВР", tm: "DM" },
    sub: { ru: "Под штангой", tm: "Derwezede" },
  },
  {
    value: "DEFENDER",
    abbr: { ru: "ЗАЩ", tm: "GR" },
    sub: { ru: "Сзади", tm: "Yzda" },
  },
  {
    value: "MIDFIELDER",
    abbr: { ru: "ПЗ", tm: "ÝG" },
    sub: { ru: "В центре", tm: "Merkezde" },
  },
  {
    value: "FORWARD",
    abbr: { ru: "НАП", tm: "HJ" },
    sub: { ru: "Впереди", tm: "Öňde" },
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
