import type { Position, SkillLevel, User } from "@prisma/client";
import { absoluteImageUrl } from "../images";

/**
 * Public shape of a user over the API.
 *
 * Fields are listed explicitly rather than spread from the Prisma row. The
 * User model carries `password` (a bcrypt hash) and `fcmToken` (a push
 * credential); a spread would ship both to every client the moment someone
 * adds a field to the schema.
 */
export type UserDto = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  position: Position | null;
  skillLevel: SkillLevel;
  district: string | null;
  age: number | null;
  isOpenToInvite: boolean;
  locale: string;
  onboardingComplete: boolean;
  /** Drives client-side UI gating only (e.g. showing a moderation entry
   * point) — every admin route re-checks the database independently, so this
   * flag being stale or spoofed grants no actual access. */
  isAdmin: boolean;
};

/** Serializes the authenticated user's own record. */
export function toUserDto(user: User, origin: string): UserDto {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    avatar: absoluteImageUrl(user.avatar, origin),
    position: user.position,
    skillLevel: user.skillLevel,
    district: user.district,
    age: user.age,
    isOpenToInvite: user.isOpenToInvite,
    locale: user.locale,
    // Mirrors lib/auth.ts: a profile counts as complete once it has a phone.
    onboardingComplete: !!user.phone,
    isAdmin: user.isAdmin,
  };
}

/**
 * Public shape of *another* user, as seen on rosters and player lists.
 *
 * Contact details and account state are omitted: phone is privacy-gated (the
 * web UI only reveals an organizer's number to players who joined), and email,
 * locale and onboarding state are nobody else's business.
 */
export type PublicUserDto = {
  id: string;
  name: string;
  avatar: string | null;
  position: Position | null;
  skillLevel: SkillLevel;
  district: string | null;
};

export function toPublicUserDto(user: User, origin: string): PublicUserDto {
  return {
    id: user.id,
    name: user.name,
    avatar: absoluteImageUrl(user.avatar, origin),
    position: user.position,
    skillLevel: user.skillLevel,
    district: user.district,
  };
}
