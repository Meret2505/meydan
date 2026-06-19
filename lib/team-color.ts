export interface TeamColor {
  key: string;
  base: string;
  edge: string;
}

export const TEAM_COLORS: TeamColor[] = [
  { key: "green", base: "#1FD16B", edge: "#14a955" },
  { key: "blue", base: "#6FB1E0", edge: "#3D89C2" },
  { key: "amber", base: "#F2B53C", edge: "#C58F1E" },
  { key: "red", base: "#E0556A", edge: "#B23B4E" },
  { key: "purple", base: "#9B8FE0", edge: "#6E62B7" },
];

export const DEFAULT_TEAM_COLOR = TEAM_COLORS[0];

export function getTeamColor(key: string | null | undefined): TeamColor {
  return TEAM_COLORS.find((c) => c.key === key) ?? DEFAULT_TEAM_COLOR;
}

export function teamGradient(key: string | null | undefined): string {
  const c = getTeamColor(key);
  return `linear-gradient(140deg, ${c.base}, ${c.edge})`;
}
