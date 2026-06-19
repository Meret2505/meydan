import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { FieldMapLazy } from "@/components/fields/FieldMapLoader";

function waLink(phone: string) {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}`;
}

export default async function FieldDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  unstable_setRequestLocale(locale);
  const field = await prisma.field.findUnique({
    where: { id },
    include: { _count: { select: { games: true } } },
  });
  if (!field) notFound();

  return (
    <>
      <div className="relative h-52 overflow-hidden">
        {field.photos[0] ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${field.photos[0]})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1c7a45] to-[#0f5530]">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 52px)",
              }}
            />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-transparent to-bg" />
        <div className="absolute top-0 left-0 right-0">
          <StatusBar />
        </div>
        <div className="absolute top-12 left-6">
          <BackButton href={`/${locale}/fields`} />
        </div>
        <div className="absolute left-6 right-6 bottom-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary text-primary-text font-display font-extrabold text-[11px] uppercase">
              {field.surface}
            </span>
            <span className="text-text/80 text-[12px] font-display font-bold uppercase tracking-wide">
              {field.district}
            </span>
          </div>
          <div className="font-display font-extrabold text-[22px] tracking-tight mt-2">
            {field.name}
          </div>
        </div>
      </div>

      <div className="px-6 pt-5 pb-32 flex flex-col gap-4">
        <div className="rounded-2xl bg-surface border border-border p-4">
          <Row label="Адрес" value={field.address} />
          <Row label="Покрытие" value={field.surface} />
          <Row label="Вместимость" value={`до ${field.capacity} игроков`} />
          <Row label="Игр прошло" value={field._count.games.toString()} />
        </div>

        {field.phone && (
          <div className="flex gap-2.5">
            <a
              href={`tel:${field.phone}`}
              className="flex-1 h-12 rounded-xl bg-primary text-primary-text font-display font-extrabold text-[14px] flex items-center justify-center gap-2"
            >
              <span>📞</span>Позвонить
            </a>
            <a
              href={waLink(field.phone)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 text-text font-display font-bold text-[14px] flex items-center justify-center gap-2"
            >
              <span>💬</span>WhatsApp
            </a>
          </div>
        )}

        {field.latitude !== null && field.longitude !== null && (
          <FieldMapLazy
            fields={[
              {
                id: field.id,
                name: field.name,
                address: field.address,
                district: field.district,
                latitude: field.latitude,
                longitude: field.longitude,
              },
            ]}
            height={240}
          />
        )}

        <Link
          href={`/${locale}/games/create?fieldId=${field.id}`}
          className="h-12 rounded-xl border border-white/15 text-text font-display font-bold text-[14px] flex items-center justify-center"
        >
          Собрать игру здесь
        </Link>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2.5 flex justify-between items-center border-b border-border last:border-0">
      <span className="text-text-muted text-[13px] font-semibold">{label}</span>
      <span className="font-display font-bold text-[14.5px] text-right max-w-[60%]">
        {value}
      </span>
    </div>
  );
}
