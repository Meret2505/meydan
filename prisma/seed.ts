import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FIELDS = [
  {
    name: "Поле «Олимп», корт 2",
    address: "ул. Беркарарлык",
    district: "Berzengi",
    surface: "Резиновое",
    capacity: 14,
  },
  {
    name: "Манеж «Ahal Arena»",
    address: "Анев",
    district: "Anev",
    surface: "Искусственная трава",
    capacity: 12,
  },
  {
    name: "Спорткомплекс «Парахат»",
    address: "ул. Гёрогли",
    district: "Parahat",
    surface: "Искусственная трава",
    capacity: 10,
  },
  {
    name: "Поле «Чоганлы»",
    address: "Чоганлы",
    district: "Choganly",
    surface: "Резиновое",
    capacity: 10,
  },
  {
    name: "Поле «Копетдаг»",
    address: "пр. Магтымгулы",
    district: "Köpetdag",
    surface: "Искусственная трава",
    capacity: 12,
  },
  {
    name: "Поле «Багтыярлык»",
    address: "Багтыярлык",
    district: "Bagtyýarlyk",
    surface: "Резиновое",
    capacity: 14,
  },
];

async function main() {
  for (const f of FIELDS) {
    const existing = await prisma.field.findFirst({ where: { name: f.name } });
    if (existing) continue;
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
