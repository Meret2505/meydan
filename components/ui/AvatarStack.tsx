function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function hue(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}

export function AvatarStack({
  people,
  max = 4,
  size = 28,
}: {
  people: { id: string; name: string }[];
  max?: number;
  size?: number;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((p, i) => (
        <div
          key={p.id}
          className="rounded-full border-2 border-surface flex items-center justify-center font-display font-extrabold text-[10px] text-[#06210F]"
          style={{
            width: size,
            height: size,
            marginLeft: i === 0 ? 0 : -8,
            background: `linear-gradient(140deg, hsl(${hue(p.id)} 70% 55%), hsl(${
              (hue(p.id) + 30) % 360
            } 70% 40%))`,
          }}
          title={p.name}
        >
          {initials(p.name)}
        </div>
      ))}
      {rest > 0 && (
        <div
          className="rounded-full border-2 border-surface bg-white/8 flex items-center justify-center font-display font-bold text-[11px] text-text-muted"
          style={{ width: size, height: size, marginLeft: -8 }}
        >
          +{rest}
        </div>
      )}
    </div>
  );
}
