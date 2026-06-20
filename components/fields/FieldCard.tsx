import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

const SURFACE_KEY: Record<string, string> = {
  "Искусственная трава": "fields.surface_turf",
  "Резиновое": "fields.surface_rubber",
  "Грунт": "fields.surface_dirt",
};

export interface FieldCardData {
  id: string;
  name: string;
  nameTm?: string | null;
  nameRu?: string | null;
  address: string;
  addressTm?: string | null;
  addressRu?: string | null;
  district: string;
  surface: string;
  capacity: number;
  photo: string | null;
}

export function FieldCard({ field }: { field: FieldCardData }) {
  const locale = useLocale();
  const t = useTranslations();
  const name =
    locale === "tm"
      ? field.nameTm ?? field.name
      : field.nameRu ?? field.name;
  const surfaceKey = SURFACE_KEY[field.surface];
  const surfaceLabel = surfaceKey ? t(surfaceKey as never) : field.surface;
  return (
    <Link
      href={`/${locale}/fields/${field.id}`}
      className="bg-surface border border-border rounded-[18px] overflow-hidden block"
    >
      {/* Pitch banner */}
      <div
        className="h-24 relative"
        style={{ background: "linear-gradient(150deg,#1c7a45,#0f5530)" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 1px,transparent 1px 40px)",
          }}
        />
        {field.photo && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${field.photo})` }}
          />
        )}
      </div>
      <div className="px-[15px] py-[13px]">
        <div className="flex items-center justify-between">
          <div className="font-display font-bold text-[16px] truncate">
            {name}
          </div>
          <span className="text-text-muted text-[18px] shrink-0">›</span>
        </div>
        <div className="flex gap-2 mt-2.5 flex-wrap">
          <Chip>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinejoin="round"
            >
              <path d="M12 21.5s7-6.7 7-11.5a7 7 0 10-14 0c0 4.8 7 11.5 7 11.5z" />
              <circle cx="12" cy="10" r="2.6" />
            </svg>
            {field.district}
          </Chip>
          <Chip>{surfaceLabel}</Chip>
          <Chip>{t("fields.capacity_chip", { count: field.capacity })}</Chip>
        </div>
      </div>
    </Link>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[12px] font-semibold text-text-soft px-[9px] py-1 rounded-[7px]"
      style={{ background: "rgba(255,255,255,.05)" }}
    >
      {children}
    </span>
  );
}
