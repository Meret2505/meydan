"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toProxyUrl } from "@/lib/storage-url";
import { toggleFieldFavorite } from "@/app/actions/fields";
import { cn } from "@/lib/utils";

const SURFACE_KEY: Record<string, string> = {
  "Искусственная трава": "fields.surface_turf",
  "Резиновое": "fields.surface_rubber",
  "Грунт": "fields.surface_dirt",
};

export interface FieldItem {
  id: string;
  name: string;
  nameTm: string | null;
  nameRu: string | null;
  district: string;
  surface: string;
  capacity: number;
  photo: string | null;
}

type ViewMode = "list" | "grid";
const STORAGE_KEY = "meydan.fields.view";

export function FieldsView({
  fields,
  favoriteIds,
}: {
  fields: FieldItem[];
  favoriteIds: string[];
}) {
  const locale = useLocale();
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [favSet, setFavSet] = useState(() => new Set(favoriteIds));
  const [, startTransition] = useTransition();

  // Persist the chosen view across sessions so mobile users don't have to
  // re-pick every time. Reads happen client-side to avoid FOUC.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "grid" || stored === "list") setView(stored);
    } catch {
      // localStorage unavailable — fall back to default.
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, view);
    } catch {
      // ignore
    }
  }, [view]);

  function toggleFavorite(fieldId: string) {
    // Optimistic — flip the star immediately, then reconcile with the server.
    setFavSet((s) => {
      const next = new Set(s);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
    startTransition(() => {
      void toggleFieldFavorite(fieldId, locale);
    });
  }

  const displayName = (f: FieldItem) =>
    locale === "tm" ? f.nameTm ?? f.name : f.nameRu ?? f.name;

  // Sort favorites first, then alphabetic within each group. Search filters
  // against the localised display name only — case- and accent-insensitive.
  const normalized = query.trim().toLocaleLowerCase(locale);
  const filtered = useMemo(() => {
    const items = fields.filter((f) => {
      if (!normalized) return true;
      const name = displayName(f).toLocaleLowerCase(locale);
      return name.includes(normalized) ||
        f.district.toLocaleLowerCase(locale).includes(normalized);
    });
    items.sort((a, b) => {
      const aFav = favSet.has(a.id) ? 0 : 1;
      const bFav = favSet.has(b.id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return displayName(a).localeCompare(displayName(b), locale);
    });
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, favSet, normalized, locale]);

  const favoriteCount = filtered.filter((f) => favSet.has(f.id)).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Search + view toggle */}
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("fields.search_placeholder")}
            className="w-full h-11 rounded-full pl-10 pr-4 bg-[var(--overlay)] border border-border text-[14.5px] text-text outline-none focus:border-primary/60"
            aria-label={t("fields.search_placeholder")}
          />
        </label>
        <ViewToggle view={view} setView={setView} labels={{
          list: t("fields.view_list_short"),
          grid: t("fields.view_grid_short"),
        }} />
      </div>

      {/* Favorites divider (shown only if we have any favorites in the view) */}
      {favoriteCount > 0 && (
        <div className="flex items-center gap-2 text-[12px] font-display font-extrabold uppercase tracking-wide text-text-muted pt-1">
          <StarIcon filled className="text-warning" width={13} />
          <span>{t("fields.favorites")}</span>
          <span className="text-text-faint font-bold">· {favoriteCount}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="mt-6 p-6 rounded-2xl bg-surface border border-border text-center">
          <div className="font-display font-extrabold text-[15px]">
            {t("empty.no_results")}
          </div>
          <div className="text-text-muted text-[13px] mt-1">
            {t("fields.no_results_sub")}
          </div>
        </div>
      ) : view === "grid" ? (
        <GridList
          fields={filtered}
          favSet={favSet}
          onToggle={toggleFavorite}
          displayName={displayName}
        />
      ) : (
        <ListView
          fields={filtered}
          favSet={favSet}
          onToggle={toggleFavorite}
          displayName={displayName}
          t={t}
        />
      )}
    </div>
  );
}

function ViewToggle({
  view,
  setView,
  labels,
}: {
  view: ViewMode;
  setView: (v: ViewMode) => void;
  labels: { list: string; grid: string };
}) {
  return (
    <div
      className="inline-flex rounded-full p-[3px] bg-[var(--overlay)] border border-border"
      role="tablist"
      aria-label="View"
    >
      <button
        type="button"
        onClick={() => setView("list")}
        aria-label={labels.list}
        aria-pressed={view === "list"}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center transition",
          view === "list" ? "bg-primary text-primary-text" : "text-text-muted",
        )}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => setView("grid")}
        aria-label={labels.grid}
        aria-pressed={view === "grid"}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center transition",
          view === "grid" ? "bg-primary text-primary-text" : "text-text-muted",
        )}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.4" />
          <rect x="14" y="3" width="7" height="7" rx="1.4" />
          <rect x="3" y="14" width="7" height="7" rx="1.4" />
          <rect x="14" y="14" width="7" height="7" rx="1.4" />
        </svg>
      </button>
    </div>
  );
}

function StarIcon({
  filled,
  className,
  width = 16,
}: {
  filled: boolean;
  className?: string;
  width?: number;
}) {
  return (
    <svg
      width={width}
      height={width}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 1.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3l2.9 5.9 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 20.9l1.2-6.5L2.5 9.8l6.6-.9L12 3z" />
    </svg>
  );
}

function FavButton({
  fieldId,
  active,
  onToggle,
  label,
  overlay,
}: {
  fieldId: string;
  active: boolean;
  onToggle: (id: string) => void;
  label: string;
  overlay?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(fieldId);
      }}
      className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95",
        overlay
          ? "bg-black/45 border border-white/25"
          : "bg-[var(--overlay)] border border-border",
        active ? "text-warning" : overlay ? "text-white" : "text-text-muted",
      )}
    >
      <StarIcon filled={active} width={16} />
    </button>
  );
}

function ListView({
  fields,
  favSet,
  onToggle,
  displayName,
  t,
}: {
  fields: FieldItem[];
  favSet: Set<string>;
  onToggle: (id: string) => void;
  displayName: (f: FieldItem) => string;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const locale = useLocale();
  return (
    <div className="flex flex-col gap-2.5">
      {fields.map((f) => {
        const surfaceLabel = SURFACE_KEY[f.surface]
          ? t(SURFACE_KEY[f.surface])
          : f.surface;
        return (
          <div key={f.id} className="relative">
            <Link
              href={`/${locale}/fields/${f.id}`}
              className="block bg-surface border border-border rounded-[18px] overflow-hidden active:scale-[0.995] transition-transform"
            >
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
                {f.photo && (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${toProxyUrl(f.photo)})` }}
                  />
                )}
              </div>
              <div className="px-[15px] py-[13px]">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display font-bold text-[16px] truncate">
                    {displayName(f)}
                  </div>
                  <span className="text-text-muted text-[18px] shrink-0">›</span>
                </div>
                <div className="flex gap-2 mt-2.5 flex-wrap">
                  <Chip>{f.district}</Chip>
                  <Chip>{surfaceLabel}</Chip>
                  <Chip>{t("fields.capacity_chip", { count: f.capacity })}</Chip>
                </div>
              </div>
            </Link>
            <div className="absolute top-2.5 right-2.5">
              <FavButton
                fieldId={f.id}
                active={favSet.has(f.id)}
                onToggle={onToggle}
                overlay
                label={t("fields.favorite")}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GridList({
  fields,
  favSet,
  onToggle,
  displayName,
}: {
  fields: FieldItem[];
  favSet: Set<string>;
  onToggle: (id: string) => void;
  displayName: (f: FieldItem) => string;
}) {
  const locale = useLocale();
  const t = useTranslations();
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {fields.map((f) => (
        <div key={f.id} className="relative">
          <Link
            href={`/${locale}/fields/${f.id}`}
            className="block bg-surface border border-border rounded-2xl overflow-hidden active:scale-[0.99] transition-transform"
          >
            <div
              className="h-24 relative"
              style={{ background: "linear-gradient(150deg,#1c7a45,#0f5530)" }}
            >
              {f.photo && (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${toProxyUrl(f.photo)})` }}
                />
              )}
            </div>
            <div className="px-3 py-2.5">
              <div className="font-display font-extrabold text-[13.5px] truncate leading-tight">
                {displayName(f)}
              </div>
              <div className="text-text-muted text-[11.5px] mt-1 truncate">
                {f.district}
              </div>
            </div>
          </Link>
          <div className="absolute top-2 right-2">
            <FavButton
              fieldId={f.id}
              active={favSet.has(f.id)}
              onToggle={onToggle}
              overlay
              label={t("fields.favorite")}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[12px] font-semibold text-text-soft px-[9px] py-1 rounded-[7px]"
      style={{ background: "var(--overlay)" }}
    >
      {children}
    </span>
  );
}
