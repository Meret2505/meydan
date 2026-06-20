import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

type Contact = { type: "phone" | "instagram" | "tiktok"; value: string };
type Attribute = { code: number; tm: string; ru: string };
type Hours = {
  [day in
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday"]: { isOpen: boolean; start: string; end: string };
};

interface FieldSeed {
  externalId: number;
  nameTm: string;
  nameRu: string;
  addressTm: string;
  addressRu: string;
  bodyTm: string | null;
  bodyRu: string | null;
  image: string | null;
  latitude: number | null;
  longitude: number | null;
  district: string;
  contacts: Contact[];
  attributes: Attribute[];
  hours: Hours | null;
}

const HOURS_19_23: Hours = {
  monday:    { isOpen: true, start: "19:00", end: "23:00" },
  tuesday:   { isOpen: true, start: "19:00", end: "23:00" },
  wednesday: { isOpen: true, start: "19:00", end: "23:00" },
  thursday:  { isOpen: true, start: "19:00", end: "23:00" },
  friday:    { isOpen: true, start: "19:00", end: "23:00" },
  saturday:  { isOpen: true, start: "19:00", end: "23:00" },
  sunday:    { isOpen: true, start: "19:00", end: "23:00" },
};
const HOURS_08_23: Hours = {
  monday:    { isOpen: true, start: "08:00", end: "23:00" },
  tuesday:   { isOpen: true, start: "08:00", end: "23:00" },
  wednesday: { isOpen: true, start: "08:00", end: "23:00" },
  thursday:  { isOpen: true, start: "08:00", end: "23:00" },
  friday:    { isOpen: true, start: "08:00", end: "23:00" },
  saturday:  { isOpen: true, start: "08:00", end: "23:00" },
  sunday:    { isOpen: true, start: "08:00", end: "23:00" },
};

const PARKING:    Attribute = { code: 8,   tm: "Awtoduralga",                       ru: "Автостоянка" };
const SEATING:    Attribute = { code: 3,   tm: "Oturyljak ýerler",                  ru: "Сидячие места" };
const GEAR_BALL:  Attribute = { code: 146, tm: "Futbol geýimleri (nakidka) we top", ru: "Футбольные накидки и мячи" };
const CHANGEROOM: Attribute = { code: 145, tm: "Eşik çalşyrylýan otag",             ru: "Раздевалка" };

const FIELDS: FieldSeed[] = [
  {
    externalId: 3619,
    nameTm: "Volta-futbol meýdançasy",
    nameRu: "Вольта-футбольное поле",
    addressTm: "30-njy mkr, \"Ak Altyn\" oteliň arkasy",
    addressRu: "30-й микрорайон, за гостиницей «Ак Алтын»",
    bodyTm: "<p>Sagat: 200 m, top: 30 m</p><p>Töwereginde market bar</p>",
    bodyRu: "<p>200 м / час, мяч: 30 манат</p><p>Рядом находится маркет</p>",
    image: "volta-futbol-meydancasy_20260423220248.png",
    latitude: 37.95183132375804,
    longitude: 58.36350474159372,
    district: "Köpetdag",
    contacts: [
      { type: "instagram", value: "volta_turkmenistan" },
      { type: "phone", value: "+99361291444" },
      { type: "tiktok", value: "volta_turkmenista" },
    ],
    attributes: [PARKING, GEAR_BALL],
    hours: HOURS_19_23,
  },
  {
    externalId: 5284,
    nameTm: "Futbol meýdançasy (Şewçenko)",
    nameRu: "Футбольное поле (Шевченко)",
    addressTm: "Görogly köçesi (Şewçenko), Baýramhan seýilgähiň gapdaly",
    addressRu: "ул. Гёроглы (Шевченко), рядом с аллеей Байрамхана",
    bodyTm: "<p>Uly meýdança: 200 m / sagat</p><p>Kiçi meýdança: 130 m / sagat</p><p>Töwereginde market bar</p>",
    bodyRu: "<p>Большое поле: 200 TMT / час</p><p>Малое поле: 130 TMT / час</p><p>Рядом находится маркет</p>",
    image: "futbol-meydancasy-sewcenko_20260421195001.png",
    latitude: 37.928745641871764,
    longitude: 58.40515989668018,
    district: "Bagtyýarlyk",
    contacts: [{ type: "phone", value: "+99363355762" }],
    attributes: [GEAR_BALL],
    hours: HOURS_08_23,
  },
  {
    externalId: 5285,
    nameTm: "Futbol meýdançasy (Bamako k.)",
    nameRu: "Футбольное поле (ул. Бaмако)",
    addressTm: "1914 köçe (Bamako), 4 mkr, seýilgähiň gapdaly",
    addressRu: "ул. 1914 (Бамако), 4-й микрорайон, рядом с аллеей",
    bodyTm: "<p>1 sagat: 200–250 m</p>",
    bodyRu: "<p>1 час: 200–250 манат</p>",
    image: "futbol-meydancasy-bamako-k_20260509213708.png",
    latitude: 37.92157036312366,
    longitude: 58.404978799532564,
    district: "Bagtyýarlyk",
    contacts: [{ type: "phone", value: "+99364380289" }],
    attributes: [GEAR_BALL],
    hours: HOURS_08_23,
  },
  {
    externalId: 5286,
    nameTm: "Futbol meýdançasy (Dosaff)",
    nameRu: "Футбольное поле (Досаф)",
    addressTm: "Dosaf, Oguzhan köçesine (Aýtakow) golaý, awtoduralganyň golaýy",
    addressRu: "Досаф, рядом с улицей Огузхана (Айтакова), возле автостоянки",
    bodyTm: null,
    bodyRu: null,
    image: "futbol-meydancasy-dosaff_20260423234821.png",
    latitude: 37.91256468190364,
    longitude: 58.38407909181606,
    district: "Köpetdag",
    contacts: [
      { type: "phone", value: "+99364191164" },
      { type: "phone", value: "+99362540249" },
    ],
    attributes: [GEAR_BALL],
    hours: null,
  },
  {
    externalId: 5287,
    nameTm: "Futbol meýdançasy (Aşgabadyň ýalkymy)",
    nameRu: "Футбольное поле (Ашхабадын ялкымы)",
    addressTm: "Görogly köçesi (Perwyý maý), Aşgabadyň ýalkymy söwda merkeziniň arka tarapynda",
    addressRu: "ул. Гёроглы (Первый май), за торговым центром «Aşgabadyň ýalkymy»",
    bodyTm: "<p>💰 1 sagat: 160 m</p><p>🌟 Rahat oýun üçin ähli şertler döredilen</p><p>🛒 Töwereginde market bar</p><p>🚿 Egin-eşik çalşyrylýan otag we duş bar</p>",
    bodyRu: "<p>💰 Цена: 1 час — 160 манат</p><p>🌟 Созданы все условия для комфортной игры и отдыха</p><p>🛒 Рядом находится маркет</p><p>🚿 Есть раздевалка и душ</p>",
    image: "futbol-meydancasy-asgabadyn-yalkymy_20260511233401.png",
    latitude: 37.95111287842152,
    longitude: 58.33428338380907,
    district: "Köpetdag",
    contacts: [
      { type: "tiktok", value: "zemin_fk" },
      { type: "phone", value: "+99361303070" },
    ],
    attributes: [PARKING, SEATING, GEAR_BALL, CHANGEROOM],
    hours: HOURS_08_23,
  },
  {
    externalId: 5290,
    nameTm: "Futbol meýdançasy (Gagarin)",
    nameRu: "Футбольное поле (Гагарина)",
    addressTm: "A. Amanow köçesi (Gagarin), Täjir markediň golaýy",
    addressRu: "ул. А. Аманова (Гагарина), рядом с маркетом «Täjir»",
    bodyTm: "<p>1 sagat: 200 m</p><p>Golaýynda market bar</p>",
    bodyRu: "<p>1 час: 200 манат</p><p>Рядом с полем находится маркет</p>",
    image: "futbol-meydancasy-gagarin_20260423234755.png",
    latitude: 37.960730178832655,
    longitude: 58.3735783449402,
    district: "Köpetdag",
    contacts: [
      { type: "phone", value: "+99364063213" },
      { type: "phone", value: "+99371404404" },
    ],
    attributes: [GEAR_BALL],
    hours: HOURS_08_23,
  },
  {
    externalId: 5291,
    nameTm: "Futbol meýdançasy (Mir 7)",
    nameRu: "Футбольное поле (Мир 7)",
    addressTm: "Parahat 7/4 (Mir 7), 171-nji çagalar bagynyň gapdaly",
    addressRu: "Парахат 7/4 (Мир 7), рядом с детским садом №171",
    bodyTm: "<p>1 sagat: 200 m</p><p>2 sagat: 300 m</p>",
    bodyRu: "<p>1 час: 200 манат</p><p>2 часа: 300 манат</p>",
    image: null,
    latitude: null,
    longitude: null,
    district: "Bagtyýarlyk",
    contacts: [
      { type: "phone", value: "+99362723222" },
      { type: "phone", value: "+99362883222" },
      { type: "instagram", value: "kumush_ganat" },
    ],
    attributes: [],
    hours: null,
  },
  {
    externalId: 5301,
    nameTm: "Futbol meýdançasy (Hezzet market)",
    nameRu: "Футбольное поле (Hezzet market)",
    addressTm: "9-njy mkr, Hezzet markediň gapdaly",
    addressRu: "9-й микрорайон, рядом с маркетом Hezzet",
    bodyTm: "<p>Meýdança ölçegi takm. 260 m</p><p>Töwereginde market bar</p>",
    bodyRu: "<p>Размер поля ок. 260 м</p><p>Рядом находится маркет</p>",
    image: null,
    latitude: null,
    longitude: null,
    district: "Köpetdag",
    contacts: [{ type: "phone", value: "+99361760050" }],
    attributes: [PARKING, GEAR_BALL, CHANGEROOM],
    hours: null,
  },
  {
    externalId: 5303,
    nameTm: "Futbol meýdançasy (14-nji tapgyr)",
    nameRu: "Футбольное поле (14-й этап)",
    addressTm: "14-nji tapgyr",
    addressRu: "14-й этап",
    bodyTm: null,
    bodyRu: null,
    image: null,
    latitude: null,
    longitude: null,
    district: "Bagtyýarlyk",
    contacts: [],
    attributes: [],
    hours: null,
  },
  {
    externalId: 5304,
    nameTm: "Futbol meýdançasy (Mir 8)",
    nameRu: "Футбольное поле (Мир 8)",
    addressTm: "Parahat 8 (Mir 8)",
    addressRu: "Парахат 8 (Мир 8)",
    bodyTm: null,
    bodyRu: null,
    image: null,
    latitude: null,
    longitude: null,
    district: "Bagtyýarlyk",
    contacts: [],
    attributes: [],
    hours: null,
  },
  {
    externalId: 5307,
    nameTm: "Futbol meýdançasy (1-nji park)",
    nameRu: "Футбольное поле (1-й парк)",
    addressTm: "Azady köçesi, Aşgabat seýilgähiniň içi (1-nji park)",
    addressRu: "ул. Азады, внутри парка Ашхабада (1-й парк)",
    bodyTm: null,
    bodyRu: null,
    image: null,
    latitude: null,
    longitude: null,
    district: "Köpetdag",
    contacts: [{ type: "phone", value: "+99364647476" }],
    attributes: [],
    hours: null,
  },
  {
    externalId: 5310,
    nameTm: "Futbol meýdançasy (14-nji tapgyr, Älem)",
    nameRu: "Футбольное поле (14-й этап, Алем)",
    addressTm: "G. Ezizow köçesi (Sowhoznyý), 14-nji tapgyr, \"Älem\" jaýy",
    addressRu: "ул. Г. Эзизова (Совхозный), 14-й этап, дом «Älem»",
    bodyTm: null,
    bodyRu: null,
    image: null,
    latitude: null,
    longitude: null,
    district: "Bagtyýarlyk",
    contacts: [],
    attributes: [],
    hours: null,
  },
  {
    externalId: 5311,
    nameTm: "Futbol meýdançasy (16-njy tapgyr, Berzeňňi)",
    nameRu: "Футбольное поле (16-й этап, Берзенги)",
    addressTm: "Magtymguly şaýoly (Swaboda), 16-njy tapgyr, Berzeňňi jaýyň arkasy (Alabaý krug)",
    addressRu: "просп. Махтумкули (Свобода), 16-й этап, за домом Берзенги (Алабай круг)",
    bodyTm: null,
    bodyRu: null,
    image: null,
    latitude: null,
    longitude: null,
    district: "Bagtyýarlyk",
    contacts: [],
    attributes: [],
    hours: null,
  },
  {
    externalId: 5312,
    nameTm: "Futbol meýdançasy (16-njy tapgyr, Täze aý)",
    nameRu: "Футбольное поле (16-й этап, Тязе ай)",
    addressTm: "Magtymguly şaýoly (Swaboda), 16-njy tapgyr, \"Täze aý\" jaýyň arkasy",
    addressRu: "просп. Махтумкули (Свобода), 16-й этап, за домом «Täze aý»",
    bodyTm: null,
    bodyRu: null,
    image: null,
    latitude: null,
    longitude: null,
    district: "Bagtyýarlyk",
    contacts: [],
    attributes: [],
    hours: null,
  },
  {
    externalId: 5313,
    nameTm: "Futbol meýdançasy (16-njy tapgyr, Owadan haly)",
    nameRu: "Футбольное поле (16-й этап, Owadan haly)",
    addressTm: "Magtymguly şaýoly (Swaboda), 16-njy tapgyr, \"Owadan haly\" jaýyň arkasy",
    addressRu: "просп. Махтумкули (Свобода), 16-й этап, за домом «Owadan haly»",
    bodyTm: null,
    bodyRu: null,
    image: null,
    latitude: null,
    longitude: null,
    district: "Bagtyýarlyk",
    contacts: [],
    attributes: [],
    hours: null,
  },
  {
    externalId: 5314,
    nameTm: "Futbol meýdançasy (Arçabil şaýoly, 42)",
    nameRu: "Футбольное поле (просп. Арчабиль, 42)",
    addressTm: "Arçabil şaýoly, 42-nji jaýyň gapdaly",
    addressRu: "просп. Арчабиль, рядом с домом №42",
    bodyTm: null,
    bodyRu: null,
    image: null,
    latitude: null,
    longitude: null,
    district: "Köpetdag",
    contacts: [],
    attributes: [],
    hours: null,
  },
  {
    externalId: 5315,
    nameTm: "Futbol meýdançasy (Arçabil şaýoly, 40)",
    nameRu: "Футбольное поле (просп. Арчабиль, 40)",
    addressTm: "Arçabil şaýoly, 40-njy jaýyň gapdaly",
    addressRu: "просп. Арчабиль, рядом с домом №40",
    bodyTm: null,
    bodyRu: null,
    image: null,
    latitude: null,
    longitude: null,
    district: "Köpetdag",
    contacts: [],
    attributes: [],
    hours: null,
  },
  {
    externalId: 5317,
    nameTm: "Futbol meýdançasy (Gurtly, Sanly bilim)",
    nameRu: "Футбольное поле (Гуртлы, Sanly bilim)",
    addressTm: "Gurtly ýaşaýyş toplumy, Sanly bilim merkeziniň golaýy",
    addressRu: "жилой массив Гуртлы, рядом с центром Sanly bilim",
    bodyTm: null,
    bodyRu: null,
    image: null,
    latitude: null,
    longitude: null,
    district: "Bagtyýarlyk",
    contacts: [],
    attributes: [],
    hours: null,
  },
  {
    externalId: 5318,
    nameTm: "Futbol meýdançasy (Gurtly, Batly bazar)",
    nameRu: "Футбольное поле (Гуртлы, рынок Batly)",
    addressTm: "Gurtly ýaşaýyş toplumy, Batly bazaryň arkasy",
    addressRu: "жилой массив Гуртлы, за рынком Batly",
    bodyTm: null,
    bodyRu: null,
    image: null,
    latitude: null,
    longitude: null,
    district: "Bagtyýarlyk",
    contacts: [],
    attributes: [],
    hours: null,
  },
];

function firstPhone(contacts: Contact[]): string | null {
  return contacts.find((c) => c.type === "phone")?.value ?? null;
}

const YAKYN_PHOTOS: Record<number, string> = {
  3619: "https://yakyn.biz:8000/media/businesses/l/volta-futbol-meydancasy_20260423220248.png",
  5284: "https://yakyn.biz:8000/media/businesses/l/futbol-meydancasy-sewcenko_20260421195001.png",
  5285: "https://yakyn.biz:8000/media/businesses/l/futbol-meydancasy-bamako-k_20260509213708.png",
  5286: "https://yakyn.biz:8000/media/businesses/l/futbol-meydancasy-dosaff_20260423234821.png",
  5287: "https://yakyn.biz:8000/media/businesses/l/futbol-meydancasy-asgabadyn-yalkymy_20260511233401.png",
  5290: "https://yakyn.biz:8000/media/businesses/l/futbol-meydancasy-gagarin_20260423234755.png",
  5291: "https://yakyn.biz:8000/media/businesses/l/futbol-meydancasy-mir-7_20260423234747.png",
  5301: "https://yakyn.biz:8000/media/businesses/l/futbol-meydancasy-merdem-kafe_20260509214353.png",
  5303: "https://yakyn.biz:8000/media/businesses/l/futbol-meydancasy-14-nji-tapgyr_20260511230804.png",
  5304: "https://yakyn.biz:8000/media/businesses/l/futbol-meydancasy-mir-8_20260511231244.png",
  5307: "https://yakyn.biz:8000/media/businesses/l/futbol-meydancasy-1-nji-park_20260518160901.png",
  5310: "https://yakyn.biz:8000/media/businesses/l/futbol-meydancasy-14-nji-tapgyr_20260518183809.png",
  5311: "https://yakyn.biz:8000/media/businesses/l/futbol-meydancasy-16-njy-tapgyr_20260518184246.png",
  5312: "https://yakyn.biz:8000/media/businesses/l/futbol-meydancasy-16-njy-tapgyr_20260518184458.png",
  5313: "https://yakyn.biz:8000/media/businesses/l/futbol-meydancasy-16-njy-tapgyr_20260518184825.png",
  5314: "https://yakyn.biz:8000/media/businesses/l/futbol-meydancasy-arcabil-sayoly_20260518190625.png",
  5315: "https://yakyn.biz:8000/media/businesses/l/futbol-meydancasy-arcabil-sayoly_20260518191008.png",
  5317: "https://yakyn.biz:8000/media/businesses/l/futbol-meydancasy-gurtly_20260518192708.png",
  5318: "https://yakyn.biz:8000/media/businesses/l/futbol-meydancasy-gurtly_20260518193910.png",
};

async function main() {
  for (const f of FIELDS) {
    const photoUrl = YAKYN_PHOTOS[f.externalId] ?? null;
    const data = {
      externalId: f.externalId,
      name: f.nameRu,
      nameTm: f.nameTm,
      nameRu: f.nameRu,
      address: f.addressRu,
      addressTm: f.addressTm,
      addressRu: f.addressRu,
      bodyTm: f.bodyTm,
      bodyRu: f.bodyRu,
      district: f.district,
      surface: "Искусственная трава",
      capacity: 12,
      phone: firstPhone(f.contacts),
      image: photoUrl ?? f.image,
      photos: photoUrl ? [photoUrl] : [],
      latitude: f.latitude,
      longitude: f.longitude,
      hours: (f.hours ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      contacts: f.contacts as unknown as Prisma.InputJsonValue,
      attributes: f.attributes as unknown as Prisma.InputJsonValue,
      isActive: true,
    };
    const result = await prisma.field.upsert({
      where: { externalId: f.externalId },
      create: data,
      update: data,
    });
    console.log(`✓ ${result.nameRu ?? result.name} (ext ${f.externalId})`);
  }
  console.log(`\nSeeded ${FIELDS.length} fields.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
