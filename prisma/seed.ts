import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FIELDS = [
  {
    name: "Поле «Олимп», корт 2",
    address: "ул. Беркарарлык",
    district: "Berzengi",
    surface: "Резиновое",
    capacity: 14,
    phone: "+99365112233",
    latitude: 37.9081,
    longitude: 58.3958,
  },
  {
    name: "Манеж «Ahal Arena»",
    address: "Анев, шоссе Mary",
    district: "Anev",
    surface: "Искусственная трава",
    capacity: 12,
    phone: "+99365221144",
    latitude: 37.8741,
    longitude: 58.512,
  },
  {
    name: "Спорткомплекс «Парахат»",
    address: "ул. Гёрогли",
    district: "Parahat",
    surface: "Искусственная трава",
    capacity: 10,
    phone: "+99365883344",
    latitude: 37.9532,
    longitude: 58.4011,
  },
  {
    name: "Поле «Чоганлы»",
    address: "Чоганлы",
    district: "Choganly",
    surface: "Резиновое",
    capacity: 10,
    phone: "+99365774422",
    latitude: 38.0103,
    longitude: 58.3502,
  },
  {
    name: "Поле «Копетдаг»",
    address: "пр. Магтымгулы",
    district: "Köpetdag",
    surface: "Искусственная трава",
    capacity: 12,
    phone: "+99365998811",
    latitude: 37.9489,
    longitude: 58.3712,
  },
  {
    name: "Поле «Багтыярлык»",
    address: "Багтыярлык",
    district: "Bagtyýarlyk",
    surface: "Резиновое",
    capacity: 14,
    phone: "+99365112299",
    latitude: 37.972,
    longitude: 58.358,
  },
];

async function main() {
  for (const f of FIELDS) {
    const existing = await prisma.field.findFirst({ where: { name: f.name } });
    if (existing) {
      await prisma.field.update({
        where: { id: existing.id },
        data: { ...f, photos: existing.photos },
      });
      continue;
    }
    await prisma.field.create({ data: { ...f, photos: [] } });
  }
  console.log(`Seeded ${FIELDS.length} fields.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
