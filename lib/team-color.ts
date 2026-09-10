export interface TeamColor {
  key: string;
  base: string;
  edge: string;
}

// Literal, not theme tokens: a team's colour is the team's identity and must
// stay the same in light and dark. One consistent scale (Tailwind 500 base /
// 600 edge) so the five swatches read as siblings, and each clears 4.5:1
// against the white monogram it sits behind.
// Kept in sync with android-native .../core/common/TeamColors.kt.
export const TEAM_COLORS: TeamColor[] = [
  { key: "green", base: "#22C55E", edge: "#16A34A" },
  { key: "blue", base: "#3B82F6", edge: "#2563EB" },
  { key: "amber", base: "#F59E0B", edge: "#D97706" },
  { key: "red", base: "#EF4444", edge: "#DC2626" },
  { key: "purple", base: "#A855F7", edge: "#9333EA" },
];

export const DEFAULT_TEAM_COLOR = TEAM_COLORS[0];

export function getTeamColor(key: string | null | undefined): TeamColor {
  return TEAM_COLORS.find((c) => c.key === key) ?? DEFAULT_TEAM_COLOR;
}

export function teamGradient(key: string | null | undefined): string {
  const c = getTeamColor(key);
  return `linear-gradient(140deg, ${c.base}, ${c.edge})`;
}
