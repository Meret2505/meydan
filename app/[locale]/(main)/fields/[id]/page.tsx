import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { FieldMapLazy } from "@/components/fields/FieldMapLoader";
import { FieldPhotoUploader } from "@/components/fields/FieldPhotoUploader";

function waLink(phone: string) {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}`;
}

type Contact = { type: "phone" | "instagram" | "tiktok"; value: string };
type Attribute = { code: number; tm: string; ru: string };
type DayHours = { isOpen: boolean; start: string; end: string };
type Hours = Record<
  "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
  DayHours
>;

const DAYS: (keyof Hours)[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export default async function FieldDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const [field, session] = await Promise.all([
    prisma.field.findUnique({
      where: { id },
      include: { _count: { select: { games: true } } },
    }),
    auth(),
  ]);
  if (!field) notFound();
  const canEditPhotos = !!session?.user?.id;

  const isTm = locale === "tm";
  const name = isTm ? field.nameTm ?? field.name : field.nameRu ?? field.name;
  const address = isTm
    ? field.addressTm ?? field.address
    : field.addressRu ?? field.address;
  const body = isTm ? field.bodyTm : field.bodyRu;

  const contacts = (field.contacts as Contact[] | null) ?? [];
  const attributes = (field.attributes as Attribute[] | null) ?? [];
  const hours = field.hours as Hours | null;

  const phoneContacts = contacts.filter((c) => c.type === "phone");
  const socialContacts = contacts.filter((c) => c.type !== "phone");

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
            {name}
          </div>
        </div>
      </div>

      <div className="px-6 pt-5 pb-32 flex flex-col gap-4">
        <div className="rounded-2xl bg-surface border border-border p-4">
          <Row label={t("fields.address")} value={address} />
          <Row label={t("fields.surface")} value={field.surface} />
          <Row
            label={t("fields.capacity")}
            value={t("fields.capacity_value", { count: field.capacity })}
          />
          <Row
            label={t("fields.games_played_label")}
            value={field._count.games.toString()}
          />
        </div>

        {body && (
          <Section title={t("fields.about")}>
            <div
              className="text-text/90 text-[14px] leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0"
              dangerouslySetInnerHTML={{ __html: body }}
            />
          </Section>
        )}

        {hours && (
          <Section title={t("fields.schedule")}>
            <div className="flex flex-col gap-1.5">
              {DAYS.map((d) => (
                <div
                  key={d}
                  className="flex justify-between items-center text-[13.5px]"
                >
                  <span className="text-text-muted font-semibold">
                    {t(`fields.day_${d}` as never)}
                  </span>
                  <span className="font-display font-bold tabular-nums">
                    {hours[d]?.isOpen
                      ? `${hours[d].start} – ${hours[d].end}`
                      : t("fields.closed")}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {attributes.length > 0 && (
          <Section title={t("fields.amenities")}>
            <div className="flex flex-wrap gap-2">
              {attributes.map((a) => (
                <span
                  key={a.code}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[12.5px] font-semibold text-text/90"
                >
                  {isTm ? a.tm : a.ru}
                </span>
              ))}
            </div>
          </Section>
        )}

        {(phoneContacts.length > 0 || socialContacts.length > 0) && (
          <Section title={t("fields.contacts")}>
            <div className="flex flex-col gap-2">
              {phoneContacts.map((c) => (
                <a
                  key={c.value}
                  href={`tel:${c.value}`}
                  className="flex items-center justify-between py-1.5 text-[14px]"
                >
                  <span className="text-text-muted">📞</span>
                  <span className="font-display font-bold tabular-nums">
                    {c.value}
                  </span>
                </a>
              ))}
              {socialContacts.map((c) => (
                <a
                  key={`${c.type}-${c.value}`}
                  href={
                    c.type === "instagram"
                      ? `https://instagram.com/${c.value}`
                      : `https://tiktok.com/@${c.value}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between py-1.5 text-[14px]"
                >
                  <span className="text-text-muted">
                    {c.type === "instagram" ? "📷" : "🎵"}
                  </span>
                  <span className="font-display font-bold">@{c.value}</span>
                </a>
              ))}
            </div>
          </Section>
        )}

        {phoneContacts[0] && (
          <div className="flex gap-2.5">
            <a
              href={`tel:${phoneContacts[0].value}`}
              className="flex-1 h-12 rounded-xl bg-primary text-primary-text font-display font-extrabold text-[14px] flex items-center justify-center gap-2"
            >
              <span>📞</span>
              {t("fields.call")}
            </a>
            <a
              href={waLink(phoneContacts[0].value)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 text-text font-display font-bold text-[14px] flex items-center justify-center gap-2"
            >
              <span>💬</span>
              {t("fields.whatsapp")}
            </a>
          </div>
        )}

        {canEditPhotos && (
          <Section title={t("fields.photos")}>
            <FieldPhotoUploader fieldId={field.id} photos={field.photos} />
          </Section>
        )}

        {field.latitude !== null && field.longitude !== null && (
          <FieldMapLazy
            fields={[
              {
                id: field.id,
                name,
                address,
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
          {t("fields.start_game_here")}
        </Link>
      </div>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-surface border border-border p-4">
      <div className="text-text-muted font-display font-bold text-[12px] uppercase tracking-wide mb-3">
        {title}
      </div>
      {children}
    </div>
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
