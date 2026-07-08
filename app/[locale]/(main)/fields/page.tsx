import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBar } from "@/components/ui/StatusBar";
import { FieldsView, type FieldItem } from "@/components/fields/FieldsView";
import { FieldMapLazy } from "@/components/fields/FieldMapLoader";
import { cn } from "@/lib/utils";

const SURFACES = ["Искусственная трава", "Резиновое", "Грунт"] as const;
const SURFACE_KEY: Record<string, string> = {
  "Искусственная трава": "fields.surface_turf",
  "Резиновое": "fields.surface_rubber",
  "Грунт": "fields.surface_dirt",
};

export default async function FieldsPage(
  props: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ district?: string; surface?: string; view?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations();
  const session = await getSession();
  const userId = session?.user?.id ?? null;

  const districtRows = await prisma.field.findMany({
    where: { isActive: true },
    select: { district: true },
    distinct: ["district"],
    orderBy: { district: "asc" },
  });
  const districts = districtRows.map((r) => r.district);

  const districtFilter = districts.includes(searchParams.district ?? "")
    ? (searchParams.district as string)
    : null;
  const surfaceFilter = (SURFACES as readonly string[]).includes(searchParams.surface ?? "")
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

  const items: FieldItem[] = fields.map((f) => ({
    id: f.id,
    name: f.name,
    nameTm: f.nameTm,
    nameRu: f.nameRu,
    district: f.district,
    surface: f.surface,
    capacity: f.capacity,
    photo: f.photos[0] ?? null,
  }));

  const favoriteIds = userId
    ? (
        await prisma.fieldFavorite.findMany({
          where: { userId },
          select: { fieldId: true },
        })
      ).map((f) => f.fieldId)
    : [];

  const pickName = (f: (typeof fields)[number]) =>
    locale === "tm" ? f.nameTm ?? f.name : f.nameRu ?? f.name;
  const pickAddress = (f: (typeof fields)[number]) =>
    locale === "tm" ? f.addressTm ?? f.address : f.addressRu ?? f.address;

  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex justify-between items-center">
        <div className="font-display font-extrabold text-[25px]">{t("nav.fields")}</div>
        <Link
          href={`/${locale}/fields${queryFor({ view: view === "map" ? null : "map" })}`}
          className="h-9 px-3 rounded-lg bg-[var(--overlay)] border border-border-strong font-display font-bold text-[13px] inline-flex items-center"
        >
          {view === "map" ? t("fields.view_list") : t("fields.view_map")}
        </Link>
      </div>

      <div className="px-6 pt-4 flex flex-col gap-2.5">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          <Chip
            href={`/${locale}/fields${queryFor({ district: null })}`}
            label={t("fields.districts_any")}
            active={!districtFilter}
          />
          {districts.map((d) => (
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
            label={t("fields.surfaces_any")}
            active={!surfaceFilter}
          />
          {SURFACES.map((s) => (
            <Chip
              key={s}
              href={`/${locale}/fields${queryFor({ surface: s })}`}
              label={t(SURFACE_KEY[s] as never)}
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
              name: pickName(f),
              address: pickAddress(f),
              district: f.district,
              latitude: f.latitude,
              longitude: f.longitude,
            }))}
            height={520}
          />
        </div>
      ) : (
        <div className="px-6 pt-4 pb-8">
          <FieldsView fields={items} favoriteIds={favoriteIds} />
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
          : "bg-[var(--overlay)] border-border text-text/80",
      )}
    >
      {label}
    </Link>
  );
}
