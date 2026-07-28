import { prisma } from "@/lib/prisma";

/**
 * Team reads for the mobile teams tab, mirroring the web teams page: the
 * user's own teams (with captain + counts) and the city ranking (top teams by
 * games then members).
 */
export async function fetchTeams(userId: string) {
  const myTeams = await prisma.team.findMany({
    where: { members: { some: { userId } } },
    include: {
      _count: { select: { members: true, games: true } },
      members: {
        where: { isCaptain: true },
        include: { user: { select: { name: true } } },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  const myIds = myTeams.map((t) => t.id);
  const others = await prisma.team.findMany({
    where: { id: { notIn: myIds } },
    include: { _count: { select: { members: true, games: true } } },
    orderBy: [{ games: { _count: "desc" } }, { members: { _count: "desc" } }],
    take: 30,
  });

  return { myTeams, others };
}
