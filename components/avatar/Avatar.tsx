function hue(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}
function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function Avatar({
  name,
  seed,
  src,
  size = 40,
  className = "",
}: {
  name: string;
  seed: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const placeholder = (
    <div
      className="absolute inset-0 rounded-full flex items-center justify-center font-display font-extrabold text-[#06210F]"
      style={{
        fontSize: Math.round(size * 0.36),
        background: `linear-gradient(140deg, hsl(${hue(seed)} 70% 55%), hsl(${
          (hue(seed) + 30) % 360
        } 70% 40%))`,
      }}
    >
      {initials(name)}
    </div>
  );

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {placeholder}
      {src && (
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </div>
  );
}
