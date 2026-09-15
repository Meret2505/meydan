import "server-only";
import { prisma } from "./prisma";

/**
 * Whether a user has admin rights — currently just field-submission
 * moderation and field-photo mutation. DB-backed (`User.isAdmin`) rather than
 * a claim on the access token: tokens live 15 minutes, so baking a role in
 * would let a just-revoked admin keep acting until the token expired. This
 * costs one query, but only admin-only routes pay it.
 *
 * Fails closed: a missing or unknown userId is never an admin.
 */
export async function isAdmin(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  return user?.isAdmin ?? false;
}
