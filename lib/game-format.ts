import type { Game } from "@prisma/client";

export function gameFormat(g: Pick<Game, "totalSpots">) {
  const n = Math.floor(g.totalSpots / 2);
  return `${n}×${n}`;
}
