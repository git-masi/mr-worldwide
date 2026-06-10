import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";
import { Prisma } from "./generated/browser";
import { Temporal } from "temporal-polyfill";
import { range } from "@repo/numbers/range";
import {
  createBookingData,
  getCreatedAtDate,
  getHotelName,
  getLengthOfStay,
} from "./utils";

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
  console.log(`✅ Created customers`);

  await createBookings(hotels, customers);

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

async function createBookings(
  hotels: { id: bigint; totalRooms: number }[],
  customers: { id: bigint }[],
) {
  const now = Temporal.Now.plainDateISO();
  const oneYearFromNow = now.add({ years: 1 });
  // Add a new booking 70% of the time
  const shouldAddBooking = () => faker.datatype.boolean({ probability: 0.7 });
  // Get a random customer
  const getCustomer = () => faker.helpers.arrayElement(customers);
  const getCreatedAt = getCreatedAtDate(now);

  let bookingData: Prisma.BookingCreateManyInput[] = [];

  for (const hotel of hotels) {
    bookingData.push(
      ...createBookingData({
        start: now,
        end: oneYearFromNow,
        hotel,
        shouldAddBooking,
        getLengthOfStay,
        getCustomer,
        getCreatedAt,
      }),
    );
  }

  await prisma.booking.createMany({ data: bookingData });
}
