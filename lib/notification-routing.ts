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
    case "FIELD_APPROVED":
      return d.fieldId ? `/${locale}/fields/${d.fieldId}` : `/${locale}/fields`;
    case "FIELD_REJECTED":
      return `/${locale}/fields`;
    case "MATCH_CHALLENGE":
    case "MATCH_ACCEPTED":
    case "MATCH_DECLINED":
    case "MATCH_RESULT_REPORTED":
    case "MATCH_RESULT_CONFIRMED":
      // The canonical link, even though the web does not render team matches
      // yet — it is the address that will be right once it does, and the app
      // routes from `data.gameId` rather than from this href.
      return d.gameId ? `/${locale}/games/${d.gameId}` : `/${locale}/teams`;
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
    case "FIELD_APPROVED":
      return "⚽";
    case "FIELD_REJECTED":
      return "🚫";
    case "MATCH_CHALLENGE":
      return "⚔️";
    case "MATCH_ACCEPTED":
      return "🤝";
    case "MATCH_DECLINED":
      return "🚫";
    case "MATCH_RESULT_REPORTED":
      return "📝";
    case "MATCH_RESULT_CONFIRMED":
      return "🏁";
  }
}
