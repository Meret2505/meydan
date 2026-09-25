import { describe, expect, it } from "vitest";
import {
  DAY_KEYS,
  parseAttributes,
  parseContacts,
  parseHours,
} from "@/lib/field-metadata";

/**
 * These columns are filled in by hand in a table editor, so the inputs worth
 * testing are the mistakes a person makes there: an object where an array
 * belongs, a number typed as a string, a missing field, a day spelled with a
 * capital. Each one used to reach a `.map` or the client unchecked.
 */
describe("field metadata read from hand-edited JSON", () => {
  describe("contacts", () => {
    it("keeps well-formed entries in order", () => {
      const raw = [
        { type: "phone", value: "+99365000001" },
        { type: "instagram", value: "meydan" },
      ];
      expect(parseContacts(raw)).toEqual(raw);
    });

    it("drops only the bad entry, not the list", () => {
      // The whole point of parsing per entry: one typo costs one contact.
      const raw = [
        { type: "phone", value: "+99365000001" },
        { type: "telegram", value: "meydan" }, // not a type we render
        { value: "no type at all" },
        { type: "tiktok", value: "" }, // empty is not a contact
        { type: "tiktok", value: "meydan" },
      ];
      expect(parseContacts(raw)).toEqual([
        { type: "phone", value: "+99365000001" },
        { type: "tiktok", value: "meydan" },
      ]);
    });

    it("yields nothing for an object, a string, or null", () => {
      // The 500: `.filter` / `.map` on an object typed instead of an array.
      expect(parseContacts({ type: "phone", value: "+99365000001" })).toEqual([]);
      expect(parseContacts("+99365000001")).toEqual([]);
      expect(parseContacts(null)).toEqual([]);
      expect(parseContacts(undefined)).toEqual([]);
    });
  });

  describe("attributes", () => {
    it("keeps well-formed entries", () => {
      const raw = [{ code: 1, ru: "Раздевалка", tm: "Geýim otagy" }];
      expect(parseAttributes(raw)).toEqual(raw);
    });

    it("drops entries with a missing or mistyped field", () => {
      const raw = [
        { code: 1, ru: "Раздевалка", tm: "Geýim otagy" },
        { code: "2", ru: "Душ", tm: "Duş" }, // code typed as a string
        { code: 3, ru: "Парковка" }, // tm forgotten
        { code: 4.5, ru: "Свет", tm: "Yşyk" }, // codes are whole numbers
      ];
      expect(parseAttributes(raw)).toEqual([
        { code: 1, ru: "Раздевалка", tm: "Geýim otagy" },
      ]);
    });

    it("yields nothing for a non-array", () => {
      expect(parseAttributes({ "1": "Раздевалка" })).toEqual([]);
    });
  });

  describe("hours", () => {
    const openDay = { isOpen: true, start: "08:00", end: "23:00" };

    it("returns every day of the week when the object parses", () => {
      const raw = Object.fromEntries(DAY_KEYS.map((d) => [d, openDay]));
      const hours = parseHours(raw);
      expect(hours).not.toBeNull();
      expect(Object.keys(hours!)).toEqual([...DAY_KEYS]);
      expect(hours!.monday).toEqual(openDay);
    });

    it("fills a missing or malformed day as closed, keeping the rest", () => {
      const hours = parseHours({
        monday: openDay,
        Tuesday: openDay, // capitalised: not the key anything reads
        wednesday: { isOpen: "yes", start: "08:00", end: "23:00" },
        thursday: { isOpen: true, start: "08:00" }, // no end
      });
      expect(hours).not.toBeNull();
      expect(hours!.monday).toEqual(openDay);
      expect(hours!.tuesday).toEqual({ isOpen: false, start: "", end: "" });
      expect(hours!.wednesday).toEqual({ isOpen: false, start: "", end: "" });
      expect(hours!.thursday).toEqual({ isOpen: false, start: "", end: "" });
      expect(hours!.sunday).toEqual({ isOpen: false, start: "", end: "" });
    });

    it("is null when nothing in the column is a day", () => {
      // Null means "no opening hours known", and both renderers hide the
      // section. A week of closed days would instead claim the pitch never
      // opens, which is a different and wrong statement.
      expect(parseHours(null)).toBeNull();
      expect(parseHours({ open: "08:00-23:00" })).toBeNull();
      expect(parseHours([openDay])).toBeNull();
      expect(parseHours("08:00-23:00")).toBeNull();
    });
  });
});
