import type { Position, Prisma, SkillLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { parseAge } from "@/lib/validate";

/**
 * Profile writes shared by the web onboarding wizard and the mobile
 * PATCH /me endpoint.
 *
 * The web flow is five separate screens that each save one field; the mobile
 * client may send several at once. Rather than duplicating validation across
 * six near-identical functions, this takes a patch of whatever fields the
 * caller has and validates each independently.
 */

const VALID_POSITIONS: Position[] = [
  "GOALKEEPER",
  "DEFENDER",
  "MIDFIELDER",
  "FORWARD",
];

const VALID_SKILLS: SkillLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

// Must match `locales` in i18n.ts and LocaleMapper on Android. English was
// added to both of those and missed here, so an English-speaking user's
// profile save came back "invalid_input" — the Android mapper sends "en".
const VALID_LOCALES = ["ru", "tm", "en"];

export type OnboardingPatch = {
  name?: string;
  phone?: string;
  position?: string;
  district?: string;
  age?: string | number | null;
  locale?: string;
  // Profile-editing extras (not collected during onboarding). skillLevel and
  // isOpenToInvite are only sent by the mobile profile-edit screen.
  skillLevel?: string;
  isOpenToInvite?: boolean;
};

export type OnboardingError = "invalid_input" | "phone_taken";

export type OnboardingResult = { ok: true } | { ok: false; error: OnboardingError };

/**
 * Applies a validated subset of profile fields.
 *
 * An invalid field rejects the whole patch and writes nothing, matching the
 * web behaviour of refusing to advance rather than saving a partial step.
 * `age` is the one exception: it has always been nullable, and an unparseable
 * value clears it rather than failing (see parseAge in lib/validate.ts).
 */
export async function updateOnboardingProfile(
  userId: string,
  patch: OnboardingPatch,
): Promise<OnboardingResult> {
  const data: Prisma.UserUpdateInput = {};

  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) return { ok: false, error: "invalid_input" };
    data.name = name;
  }

  if (patch.position !== undefined) {
    if (!VALID_POSITIONS.includes(patch.position as Position)) {
      return { ok: false, error: "invalid_input" };
    }
    data.position = patch.position as Position;
  }

  if (patch.district !== undefined) {
    const district = patch.district.trim();
    if (!district) return { ok: false, error: "invalid_input" };
    data.district = district;
  }

  if (patch.locale !== undefined) {
    if (!VALID_LOCALES.includes(patch.locale)) {
      return { ok: false, error: "invalid_input" };
    }
    data.locale = patch.locale;
  }

  if (patch.age !== undefined) {
    data.age = patch.age === null ? null : parseAge(String(patch.age));
  }

  if (patch.skillLevel !== undefined) {
    // Mirror the web profile action: an unrecognized value falls back to
    // BEGINNER rather than rejecting the whole patch.
    data.skillLevel = VALID_SKILLS.includes(patch.skillLevel as SkillLevel)
      ? (patch.skillLevel as SkillLevel)
      : "BEGINNER";
  }

  if (patch.isOpenToInvite !== undefined) {
    data.isOpenToInvite = patch.isOpenToInvite;
  }

  if (patch.phone !== undefined) {
    const phone = normalizePhone(patch.phone.trim());
    if (!phone) return { ok: false, error: "invalid_input" };

    // Don't let a user claim a phone already bound to someone else (would let
    // an attacker squat a victim's number and break the victim's phone login).
    const holder = await prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (holder && holder.id !== userId) return { ok: false, error: "phone_taken" };

    data.phone = phone;
  }

  if (Object.keys(data).length === 0) return { ok: true };

  try {
    await prisma.user.update({ where: { id: userId }, data });
    return { ok: true };
  } catch (e) {
    // The check above is not atomic: two users can both pass it and race to
    // claim the same number, and User.phone is @unique. Previously this threw
    // an unhandled P2002 and surfaced as a Next error boundary; report the
    // real reason instead.
    if (e && typeof e === "object" && (e as { code?: string }).code === "P2002") {
      return { ok: false, error: "phone_taken" };
    }
    throw e;
  }
}
