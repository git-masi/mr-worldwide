import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";
import { Prisma } from "./generated/browser";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const NUM_HOTELS = 1000;
const MIN_HOTEL_ROOMS = 10;
const MAX_HOTEL_ROOMS = 100;
const NUM_CUSTOMERS = 10_000;

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.hotel.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.customer.deleteMany();

  const hotels = await createHotels();
  console.log(`✅ Created hotels`);

  const customers = await createCustomers();
  console.log(`✅ Created hotels`);

  await createBookings();
}

function createHotels() {
  const hotelData: Prisma.HotelCreateManyInput[] = [];

  for (const _ of range(NUM_HOTELS)) {
    hotelData.push({
      name: getHotelName(),
      totalRooms: faker.number.int({
        min: MIN_HOTEL_ROOMS,
        max: MAX_HOTEL_ROOMS,
        multipleOf: 5,
      }),
    });
  }

  return prisma.hotel.createManyAndReturn({
    data: hotelData,
    select: { id: true, totalRooms: true },
  });
}

function createCustomers() {
  const users: Prisma.CustomerCreateManyInput[] = [];

  for (const _ of range(NUM_CUSTOMERS)) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    users.push({
      firstName,
      lastName,
      // If this does not provide enough randomness add another random number to the end of the last name.
      email: faker.internet.email({
        firstName,
        lastName,
      }),
    });
  }

  return prisma.customer.createManyAndReturn({
    data: users,
    select: { id: true },
  });
}

async function createBookings(
  startDate: Date,
  endDate: Date,
  hotel: { id: bigint; totalRooms: number },
  customers: { id: bigint }[],
) {
  return Promise.resolve();
}

// =====
// utils
// =====

// Randomize (mutate) the order of elements in an array
export function randomize<T>(arr: T[]) {
  const len = arr.length;
  let end = len - 1;

  // We only need to loop len - 1 times because the final element would just swap with itself
  for (const _ of range(len - 1)) {
    const idx = faker.number.int({ min: 0, max: end });

    // @ts-ignore
    [arr[idx], arr[end]] = [arr[end], arr[idx]];

    end--;
  }
}

/* Create an iterator that can be used to range from 0 to n - 1 */
function* range(n: number) {
  for (let i = 0; i < n; i++) {
    yield i;
  }
}

function* batch<T>(arr: T[], size: number) {
  for (let i = 0; i < arr.length; i += size) {
    yield arr.slice(i, i + size);
  }
}

const hotelNames = [
  "Autograph Collection Hotels",
  "Best Western",
  "Bowman-Biltmore Hotels",
  "Hilton Worldwide",
  "Hyatt Hotels and Resorts",
  "Kimpton hotels",
  "Loews Hotels",
  "Park Inn by Radisson",
  "Park Plaza Hotels & Resorts",
  "Red Lion Hotels Corporation",
  "Wyndham brands",
  "21c Museum Hotels",
  "Ace Hotel",
  "Affinia Hotel Collection",
  "AJ Capital Partners",
  "Aloft Hotels",
  "AmericInn",
  "Aqua-Aston Hospitality",
  "Archer Hotels",
  "Ascend Collection",
  "Avid Hotels",
  "Baymont by Wyndham",
  "BD Hotels",
  "Budget Host",
  "Cambria Hotels",
  "Candlewood Suites",
  "Chartwell Leisure",
  "Choice Hotels",
  "Club Quarters",
  "Coast Hotels",
  "Cobblestone Hotels",
  "Comfort Inn and Suites",
  "Country Inn & Suites",
  "The Davenport Hotel Collection",
  "Days Inn",
  "Drury Hotels",
  "Econo Lodge",
  "Eppley Hotel Company",
  "Everhome Suites",
  "Fontainebleau Development",
  "Grand America Hotels & Resorts",
  "Heartland Inn",
  "Hilton Worldwide",
  "Holiday Inn",
  "Hospitality International",
  "Hotel RL",
  "Hyatt",
  "IHG Army Hotels",
  "InterContinental",
  "Jameson Inn",
  "Jimmy Buffett's Margaritaville",
  "Knights Inn",
  "La Quinta Inns & Suites",
  "Lark Hotels",
  "MainStay Suites",
  "Manger Hotels",
  "Marcus Hotels and Resorts",
  "Masters Inn",
  "MCR Hotels",
  "Morgans Hotel Group",
  "Motel 6",
  "Nylo Hotels",
  "Omni Hotels & Resorts",
  "Outrigger Resorts & Hotels",
  "Park Plaza Hotels & Resorts",
  "Pendry Hotels and Resorts",
  "Radisson Hotels",
  "Radisson Red",
  "Ramada",
  "Red Carpet Inn",
  "Red Lion Hotels",
  "Red Lion Hotels Corporation",
  "Red Roof Inn",
  "The Ritz-Carlton Hotel Company",
  "RockResorts",
  "Rodeway Inn",
  "Schimmel Hotels",
  "Scottish Inns",
  "Shilo Inns",
  "Shoney's Inn",
  "Sonesta International Hotels",
  "Spark by Hilton",
  "Standard Hotels",
  "Suburban Studios",
  "Susse Chalet",
  "The Valorian Los Angeles",
  "Tru by Hilton",
  "The Trump Organization",
  "U.S. Franchise Systems",
  "Vagabond Inn",
  "Valencia Hotel Group",
  "Vantage Hospitality",
  "Virgin Hotels",
  "WoodSpring Suites",
  "Wyndham Hotels & Resorts",
  "Xenia Hotels & Resorts",
];

const hotelLocationFns = [
  faker.location.street,
  faker.location.city,
  faker.location.county,
];

function getHotelName(): string {
  const name =
    hotelNames[faker.number.int({ min: 0, max: hotelNames.length - 1 })]!;

  const location =
    hotelLocationFns[
      faker.number.int({ min: 0, max: hotelLocationFns.length - 1 })
    ]!;

  return `${name} ${location}`;
}
