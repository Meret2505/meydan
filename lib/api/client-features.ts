/**
 * What the client on the other end can make sense of.
 *
 * A team match is a `Game` row, so it travels down the same pipes as an
 * ordinary game — and a build that has never heard of one draws it as exactly
 * that: "0/0 players", an empty avatar stack, and a Join button that answers
 * 409. Worse, the tap is reachable from a notification, which lands in an old
 * build's inbox regardless of its version.
 *
 * So the client says what it understands and the server sends only that. A
 * request with no header is an older build, and the level is 0.
 *
 * The number is a floor, not a set: each level includes everything below it.
 * That keeps the check a comparison rather than a growing list, at the cost
 * of never being able to remove a feature — which is the right trade for a
 * client that ships as a file people install by hand.
 */

export const FEATURE_HEADER = "x-meydan-features";

/** Level 1: team matches — a game with two teams and no individual joining. */
export const FEATURE_TEAM_MATCHES = 1;

export function clientFeatureLevel(request: Request): number {
  const raw = request.headers.get(FEATURE_HEADER);
  if (raw === null) return 0;
  const level = Number.parseInt(raw, 10);
  // A header we cannot read is not a promise we can rely on.
  return Number.isFinite(level) && level > 0 ? level : 0;
}

export function supportsTeamMatches(request: Request): boolean {
  return clientFeatureLevel(request) >= FEATURE_TEAM_MATCHES;
}
