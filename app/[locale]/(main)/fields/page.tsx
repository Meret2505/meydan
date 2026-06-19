import Link from "next/link";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { StatusBar } from "@/components/ui/StatusBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldCard, type FieldCardData } from "@/components/fields/FieldCard";
import { FieldMapLazy } from "@/components/fields/FieldMapLoader";
import { DISTRICTS } from "@/lib/data";
import { cn } from "@/lib/utils";

const SURFACES = ["Искусственная трава", "Резиновое", "Грунт"];

export default async function FieldsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { district?: string; surface?: string; view?: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const districtFilter = DISTRICTS.includes(searchParams.district ?? "")
    ? (searchParams.district as string)
    : null;
  const surfaceFilter = SURFACES.includes(searchParams.surface ?? "")
    ? (searchParams.surface as string)
    : null;
  const view = searchParams.view === "map" ? "map" : "list";

  const fields = await prisma.field.findMany({
    where: {
      isActive: true,
      ...(districtFilter ? { district: districtFilter } : {}),
      ...(surfaceFilter ? { surface: surfaceFilter } : {}),
    },
    orderBy: { name: "asc" },
  });

  const queryFor = (overrides: Record<string, string | null>) => {
    const q = new URLSearchParams();
    const next = {
      district: districtFilter,
      surface: surfaceFilter,
      view: view === "map" ? "map" : null,
      ...overrides,
    };
    for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `?${s}` : "";
  };

  const cards: FieldCardData[] = fields.map((f) => ({
    id: f.id,
    name: f.name,
    address: f.address,
    district: f.district,
    surface: f.surface,
    capacity: f.capacity,
    photo: f.photos[0] ?? null,
  }));

  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex justify-between items-center">
        <div className="font-display font-extrabold text-[25px]">{t("nav.fields")}</div>
        <Link
          href={`/${locale}/fields${queryFor({ view: view === "map" ? null : "map" })}`}
          className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 font-display font-bold text-[13px] inline-flex items-center"
        >
          {view === "map" ? "Списком" : "Карта"}
        </Link>
      </div>

      <div className="px-6 pt-4 flex flex-col gap-2.5">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          <Chip
            href={`/${locale}/fields${queryFor({ district: null })}`}
            label="Все районы"
            active={!districtFilter}
          />
          {DISTRICTS.map((d) => (
            <Chip
              key={d}
              href={`/${locale}/fields${queryFor({ district: d })}`}
              label={d}
              active={districtFilter === d}
            />
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          <Chip
            href={`/${locale}/fields${queryFor({ surface: null })}`}
            label="Любое покрытие"
            active={!surfaceFilter}
          />
          {SURFACES.map((s) => (
            <Chip
              key={s}
              href={`/${locale}/fields${queryFor({ surface: s })}`}
              label={s}
              active={surfaceFilter === s}
            />
          ))}
        </div>
      </div>

      {view === "map" ? (
        <div className="px-6 pt-4 pb-8">
          <FieldMapLazy
            fields={fields.map((f) => ({
              id: f.id,
              name: f.name,
              address: f.address,
              district: f.district,
              latitude: f.latitude,
              longitude: f.longitude,
            }))}
            height={520}
          />
        </div>
      ) : (
        <div className="px-6 pt-4 pb-8 flex flex-col gap-2.5">
          {cards.length === 0 ? (
            <EmptyState
              icon={<span className="text-2xl">📍</span>}
              title={t("empty.no_results")}
              description="Снимите фильтры или загляните позже."
            />
          ) : (
            cards.map((c) => <FieldCard key={c.id} field={c} />)
          )}
        </div>
      )}
    </>
  );
}

function Chip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "px-3 py-2 rounded-full whitespace-nowrap border font-bold text-[13px]",
        active
          ? "bg-primary/13 border-primary/35 text-primary"
          : "bg-white/5 border-white/8 text-text/80",
      )}
    >
      {label}
    </Link>
  );
}
