import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";
import { Prisma } from "./generated/browser";
import { MinHeap } from "@datastructures-js/heap";
import { Temporal } from "temporal-polyfill";
import { BookingCreateManyInput } from "./generated/models";

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

  const now = Temporal.Now.plainDateISO();
  let count = 0;

  for (const hotel of hotels) {
    await createBookings(now, hotel, customers);
    // This could be achieved using a traditional for loop but this works too
    count++;
    console.log(`Created bookings for hotel ${count}/${hotels.length}`);
  }
  console.log(`✅ Created bookings`);
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
  const customerData: Prisma.CustomerCreateManyInput[] = [];

  for (const _ of range(NUM_CUSTOMERS)) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    customerData.push({
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
    data: customerData,
    select: { id: true },
  });
}

const weightedLengthOfStay = [
  // To make this easier to reason about the weights add up to 100 so that
  // each weight has an x/100 chance of being selected.
  { weight: 10, value: 1 },
  { weight: 15, value: 2 },
  { weight: 25, value: 3 },
  { weight: 20, value: 4 },
  { weight: 20, value: 5 },
  { weight: 5, value: 6 },
  { weight: 5, value: 7 },
];

function createBookings(
  now: Temporal.PlainDate,
  hotel: { id: bigint; totalRooms: number },
  customers: { id: bigint }[],
) {
  const bookingData: BookingCreateManyInput[] = [];

  const rooms = new MinHeap<{ checkOut: string }>(
    (booking) => booking.checkOut,
  );

  const oneYearFromNow = now.add({ years: 1 });
  let currentDate = now;

  while (Temporal.PlainDate.compare(currentDate, oneYearFromNow) < 0) {
    // Free up rooms where the occupant is checking out on `currentDate`
    let root = rooms.root();
    while (
      root !== null &&
      Temporal.PlainDate.compare(
        currentDate,
        Temporal.PlainDate.from(root.checkOut),
      ) >= 0
    ) {
      rooms.pop();
      root = rooms.root();
    }

    for (const _ of range(hotel.totalRooms - rooms.size())) {
      // We will add a new booking 70% of the time
      const addBooking = faker.datatype.boolean({ probability: 0.7 });
      if (!addBooking) {
        continue;
      }

      const numNights =
        faker.helpers.weightedArrayElement(weightedLengthOfStay);

      const customer = faker.helpers.arrayElement(customers);

      // Add booking data to save to DB
      bookingData.push({
        hotelId: hotel.id,
        customerId: customer.id,
        createdAt: faker.date.recent({
          days: 90,
          refDate: currentDate.toString(),
        }), // take the current date and select a date up to 3 months in the past
        checkIn: currentDate.toString(), // current date
        checkOut: currentDate.add({ days: numNights }).toString(), // add days equal to numNights to the current date
      });

      // Mark room as taken
      rooms.push({ checkOut: currentDate.add({ days: numNights }).toString() });
    }

    currentDate = currentDate.add({ days: 1 });
  }

  return prisma.booking.createMany({ data: bookingData });
}

// =====
// utils
// =====

/* Create an iterator that can be used to range from 0 to n - 1 */
function* range(n: number) {
  for (let i = 0; i < n; i++) {
    yield i;
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
