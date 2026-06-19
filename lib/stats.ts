import { prisma } from "./prisma";

export async function getPlayerStats(userId: string) {
  const participants = await prisma.gameParticipant.findMany({
    where: { userId, attended: { not: null } },
    select: { attended: true },
  });
  const attended = participants.filter((p) => p.attended === true).length;
  const total = participants.length;
  const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : null;
  return { gamesPlayed: attended, attendanceRate, totalJoined: total };
}

export function attendanceTier(rate: number | null): "reliable" | "ok" | "poor" | "new" {
  if (rate === null) return "new";
  if (rate >= 80) return "reliable";
  if (rate >= 50) return "ok";
  return "poor";
}
