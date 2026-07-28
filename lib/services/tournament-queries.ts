import { prisma } from "@/lib/prisma";

/**
 * All tournaments with team + match counts, for the mobile tournaments tab.
 * Capped at 80 like the web; the client splits them into upcoming / ongoing /
 * ended tabs by the server-computed status.
 */
export async function fetchTournaments() {
  return prisma.tournament.findMany({
    include: { _count: { select: { teams: true, matches: true } } },
    orderBy: { startDate: "asc" },
    take: 80,
  });
}
