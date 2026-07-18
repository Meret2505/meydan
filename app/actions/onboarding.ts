"use server";

import { auth } from "@/lib/auth";
import { updateOnboardingProfile } from "@/lib/services/onboarding";
import { redirect } from "next/navigation";

/**
 * Onboarding wizard steps.
 *
 * Validation and persistence live in lib/services/onboarding.ts so the mobile
 * PATCH /me endpoint applies exactly the same rules. Each action here reads
 * FormData, delegates, and advances to the next step — a rejected patch writes
 * nothing and simply does not redirect, which is the pre-existing behaviour.
 */

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function saveName(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const locale = String(formData.get("locale") ?? "ru");
  const result = await updateOnboardingProfile(userId, {
    name: String(formData.get("name") ?? ""),
  });
  if (!result.ok) return;
  redirect(`/${locale}/onboarding/phone`);
}

export async function savePhone(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const locale = String(formData.get("locale") ?? "ru");
  const result = await updateOnboardingProfile(userId, {
    phone: String(formData.get("phone") ?? ""),
  });
  if (!result.ok) return;
  redirect(`/${locale}/onboarding/position`);
}

export async function savePosition(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const locale = String(formData.get("locale") ?? "ru");
  const result = await updateOnboardingProfile(userId, {
    position: String(formData.get("position") ?? ""),
  });
  if (!result.ok) return;
  redirect(`/${locale}/onboarding/district`);
}

export async function saveDistrict(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const locale = String(formData.get("locale") ?? "ru");
  const result = await updateOnboardingProfile(userId, {
    district: String(formData.get("district") ?? ""),
  });
  if (!result.ok) return;
  redirect(`/${locale}/onboarding/age`);
}

export async function saveAge(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const locale = String(formData.get("locale") ?? "ru");
  await updateOnboardingProfile(userId, {
    age: String(formData.get("age") ?? ""),
    locale,
  });
  redirect(`/${locale}/games`);
}

export async function skipAge(locale: string) {
  const userId = await requireUserId();
  // Skipping must still persist the language choice. Previously this action
  // wrote nothing at all, so a user who picked Turkmen and then skipped the
  // age step silently kept the default Russian — which is the locale the
  // server later uses for their push notifications.
  await updateOnboardingProfile(userId, { locale });
  redirect(`/${locale}/games`);
}
