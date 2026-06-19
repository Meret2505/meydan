import type { NotificationType } from "@prisma/client";

export function notificationHref(
  type: NotificationType,
  data: unknown,
  locale: string,
): string {
  const d = (data ?? {}) as Record<string, string>;
  switch (type) {
    case "GAME_INVITE":
    case "GAME_CANCELLED":
    case "GAME_REMINDER":
    case "RESULT_NEEDED":
    case "PLAYER_JOINED":
    case "SPOT_OPENED":
      return d.gameId ? `/${locale}/games/${d.gameId}` : `/${locale}/games`;
    case "TEAM_INVITE":
      return d.teamId ? `/${locale}/teams/${d.teamId}` : `/${locale}/teams`;
  }
}

export function notificationIcon(type: NotificationType): string {
  switch (type) {
    case "GAME_INVITE":
      return "📨";
    case "GAME_CANCELLED":
      return "❌";
    case "GAME_REMINDER":
      return "⏰";
    case "RESULT_NEEDED":
      return "📝";
    case "PLAYER_JOINED":
      return "✅";
    case "SPOT_OPENED":
      return "🔔";
    case "TEAM_INVITE":
      return "👥";
  }
}
