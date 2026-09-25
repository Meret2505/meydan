import { z } from "zod";

/**
 * The three hand-maintained JSON columns on Field — `hours`, `contacts`,
 * `attributes` — read defensively.
 *
 * Nothing in the codebase writes them. approveFieldSubmission says so out
 * loud: the richer metadata is "left for Meret to add on the Field
 * afterwards", which means the only author is a person typing JSON into
 * Supabase's table editor. Both readers then cast the column straight to a
 * TypeScript type and used it:
 *
 *     const attributes = (field.attributes as Attribute[] | null) ?? [];
 *     ...
 *     attributes.map((a) => ...)
 *
 * A cast checks nothing at runtime. Type an object where an array belongs and
 * `.map` is not a function — the route handler turns that into a 500 and the
 * pitch page is simply dead in the app, with "internal" as the only clue.
 * `contacts` was worse: passed to the client unparsed, so a wrong shape
 * surfaced on Android as a serializer failure, which that client reports as
 * "no connection".
 *
 * So each column is parsed, and parsed *per entry*: one mistyped contact drops
 * that contact, not the whole list. A page missing one amenity is a typo to
 * notice later; a page that will not load is an outage.
 */

export const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type DayKey = (typeof DAY_KEYS)[number];

export type Contact = z.infer<typeof contactSchema>;
export type Attribute = z.infer<typeof attributeSchema>;
export type DayHours = z.infer<typeof dayHoursSchema>;

const contactSchema = z.object({
  type: z.enum(["phone", "instagram", "tiktok"]),
  value: z.string().min(1),
});

const attributeSchema = z.object({
  code: z.number().int(),
  tm: z.string(),
  ru: z.string(),
});

const dayHoursSchema = z.object({
  isOpen: z.boolean(),
  start: z.string(),
  end: z.string(),
});

/**
 * Entries that parse, in order; anything else dropped.
 *
 * Not `z.array(schema)`, which is all-or-nothing — one bad row would empty the
 * section. A non-array (the object-instead-of-array slip) yields nothing,
 * which is the same outcome the column being absent already has.
 */
function parseEach<T>(raw: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const parsed = schema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

export function parseContacts(raw: unknown): Contact[] {
  return parseEach(raw, contactSchema);
}

export function parseAttributes(raw: unknown): Attribute[] {
  return parseEach(raw, attributeSchema);
}

/**
 * The week, keyed by day, or null when the column holds no usable object.
 *
 * Every day is present in the result whenever *any* of them parsed, because
 * both renderers walk DAY_KEYS and expect a row per day. A day that is missing
 * or malformed reads as closed — the honest answer for a pitch whose hours
 * nobody has filled in correctly, and the behaviour the mobile serializer
 * already had for missing keys.
 */
export function parseHours(raw: unknown): Record<DayKey, DayHours> | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;

  const source = raw as Record<string, unknown>;
  const parsed = DAY_KEYS.map(
    (day) => [day, dayHoursSchema.safeParse(source[day])] as const,
  );
  if (!parsed.some(([, result]) => result.success)) return null;

  return Object.fromEntries(
    parsed.map(([day, result]) => [
      day,
      result.success ? result.data : { isOpen: false, start: "", end: "" },
    ]),
  ) as Record<DayKey, DayHours>;
}
