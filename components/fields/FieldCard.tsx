import Link from "next/link";
import { useLocale } from "next-intl";

export interface FieldCardData {
  id: string;
  name: string;
  address: string;
  district: string;
  surface: string;
  capacity: number;
  photo: string | null;
}

function hue(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}

export function FieldCard({ field }: { field: FieldCardData }) {
  const locale = useLocale();
  return (
    <Link
      href={`/${locale}/fields/${field.id}`}
      className="flex gap-3 p-3 rounded-2xl bg-surface border border-border active:scale-[0.99] transition-transform"
    >
      <div
        className="w-20 h-20 rounded-xl shrink-0 overflow-hidden relative bg-gradient-to-br from-[#1c7a45] to-[#0f5530]"
        style={
          field.photo
            ? { backgroundImage: `url(${field.photo})`, backgroundSize: "cover" }
            : {
                background: `linear-gradient(140deg, hsl(${hue(field.id)} 55% 35%), hsl(${
                  (hue(field.id) + 20) % 360
                } 60% 25%))`,
              }
        }
      >
        {!field.photo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "repeating-linear-gradient(90deg, rgba(255,255,255,.08) 0 1px, transparent 1px 18px)",
              }}
            />
            <span className="relative font-display font-extrabold text-[20px] text-white/85">
              {field.name.match(/[«"]([^»"]+)[»"]/)?.[1]?.slice(0, 2).toUpperCase() ??
                field.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-extrabold text-[15px] leading-tight">
          {field.name}
        </div>
        <div className="text-text-muted text-[12.5px] mt-1 truncate">{field.address}</div>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full bg-white/8 text-text-muted font-display font-bold text-[10.5px] uppercase">
            {field.district}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-primary/12 text-primary font-display font-bold text-[10.5px] uppercase">
            {field.surface}
          </span>
          <span className="text-text-muted text-[11.5px]">·  до {field.capacity}</span>
        </div>
      </div>
    </Link>
  );
}
