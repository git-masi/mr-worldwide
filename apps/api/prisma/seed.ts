import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";
import { Prisma } from "./generated/browser";
import { Temporal } from "temporal-polyfill";
import { range } from "@repo/numbers/range";
import { createWriteStream, createReadStream } from "node:fs";
import { once } from "node:events";
import pg from "pg";
import { from as copyFrom } from "pg-copy-streams";

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

// const NUM_HOTELS = 1000;
const NUM_HOTELS = 10;
const MIN_HOTEL_ROOMS = 10;
const MAX_HOTEL_ROOMS = 100;
// const NUM_CUSTOMERS = 10_000;
const NUM_CUSTOMERS = 10;

// This allows `BigInt` values to be serialized using `JSON.stringify`.
// There are alternative ways to achieve the same results, but this is the easiest for our use case.
// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

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

  const path = "./temp/bookings.csv";

  await createBookings(hotels, customers, path);

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
  path: string,
) {
  const now = Temporal.Now.plainDateISO();
  const oneYearFromNow = now.add({ years: 1 });
  // Add a new booking 70% of the time
  const shouldAddBooking = () => faker.datatype.boolean({ probability: 0.7 });
  // Get a random customer
  const getCustomer = () => faker.helpers.arrayElement(customers);
  const getCreatedAt = getCreatedAtDate(now.subtract({ days: 90 }));

  // =====================
  // Write bookings to CSV
  // =====================

  const output = createWriteStream(path);

  async function write(chunk: string) {
    if (!output.write(chunk)) {
      await once(output, "drain");
    }
  }

  await write("hotel_id,customer_id,created_at,check_in,check_out\n");

  let bookingData: string[] = [];

  for (const hotel of hotels) {
    createBookingData({
      start: now,
      end: oneYearFromNow,
      hotel,
      shouldAddBooking,
      getLengthOfStay,
      getCustomer,
      getCreatedAt,
    }).forEach((booking) => {
      bookingData.push(
        `${booking.hotelId},${booking.customerId},${booking.createdAt},${booking.checkIn},${booking.checkOut}`,
      );
    });

    if (bookingData.length > 10_000) {
      console.log(`Flushing bookings to disk`);
      await write(bookingData.join("\n") + "\n");
      // Reset the array so it can be reused
      bookingData.length = 0;
    }
  }

  output.end();

  await once(output, "finish");

  console.log("Finished writing bookings to CSV");

  // ================
  // Stream CSV to DB
  // ================

  const client = new pg.Client({
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "postgres",
    database: "mrww",
  });

  await client.connect();

  const copyStream = client.query(
    copyFrom(`
      COPY bookings (
        hotel_id,
        customer_id,
        created_at,
        check_in,
        check_out
      )
      FROM STDIN
      WITH (
        FORMAT csv,
        HEADER true
      )
    `),
  );

  const fileStream = createReadStream(path);

  await new Promise((res, rej) => {
    fileStream.pipe(copyStream).on("finish", res).on("error", rej);

    fileStream.on("error", rej);
  });

  await client.end();
}
