import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";
import { Prisma } from "./generated/browser";
import { Temporal } from "temporal-polyfill";
import { range } from "@repo/numbers/range";
import {
  createWriteStream,
  createReadStream,
  existsSync,
  mkdirSync,
} from "node:fs";
import { once } from "node:events";
import pg from "pg";
import { from as copyFrom } from "pg-copy-streams";

import {
  createBookingData,
  getCreatedAtDate,
  getHotelName,
  getLengthOfStay,
  getRandomGuest,
} from "./utils";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const NUM_DAYS_IN_YEAR = 365;
const NUM_HOTELS = 500;
const MIN_HOTEL_ROOMS = 10;
const MAX_HOTEL_ROOMS = 100;
const APPROXIMATE_AVERAGE_HOTEL_ROOMS = (MAX_HOTEL_ROOMS + MIN_HOTEL_ROOMS) / 2;
const OCCUPANCY_RATE = 0.7;
// sum of each length of stay * it's weight / sum of weights
// (10×1+15×2+25×3+20×4+20×5+5×6+5×7) / (10+15+25+20+20+5+5)
const WEIGHTED_AVERAGE_NIGHTS = 3.6;
// We use a formula to estimate the number of bookings we will have.
// This is useful for determining how many guests we will need.
// (500 * 55 * 365 * .7) / 3.6 = 1,951,736
// From experience the number of bookings produced is closer to 2.4 million
const APPROXIMATE_BOOKINGS =
  (NUM_HOTELS *
    APPROXIMATE_AVERAGE_HOTEL_ROOMS *
    NUM_DAYS_IN_YEAR *
    OCCUPANCY_RATE) /
  WEIGHTED_AVERAGE_NIGHTS;
// Calculate number of guests based on expected bookings to ensure a large pool available
const NUM_GUESTS = APPROXIMATE_BOOKINGS / 2;
const BOOKINGS_BUFFER = 50_000;

// This allows `BigInt` values to be serialized using `JSON.stringify`.
// There are alternative ways to achieve the same results, but this is the easiest for our use case.
// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const postgresUser = process.env.POSTGRES_USER;
const postgresPassword = process.env.POSTGRES_PASSWORD;
const postgresDb = process.env.POSTGRES_DB;

if (!postgresUser || !postgresPassword || !postgresDb) {
  throw new Error(`Missing one or more env vars`);
}

const client = new pg.Client({
  host: "localhost",
  port: 5432,
  user: postgresUser,
  password: postgresPassword,
  database: postgresDb,
});

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

  const dir = "./temp";
  const path = `${dir}/bookings.csv`;

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  await prisma.booking.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.guest.deleteMany();

  const hotels = await createHotels();
  console.log(`✅ Created hotels`);

  const guests = await createGuests();
  console.log(`✅ Created guests`);

  await createBookings(hotels, guests, path);

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

function createGuests() {
  const guestData: Prisma.GuestCreateManyInput[] = [];

  for (const _ of range(NUM_GUESTS)) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    guestData.push({
      firstName,
      lastName,
      // If this does not provide enough randomness add another random number to the end of the last name.
      email: faker.internet.email({
        firstName,
        lastName,
      }),
    });
  }

  return prisma.guest.createManyAndReturn({
    data: guestData,
    select: { id: true },
  });
}

async function createBookings(
  hotels: { id: bigint; totalRooms: number }[],
  guests: { id: bigint }[],
  path: string,
) {
  const now = Temporal.Now.plainDateISO();
  const oneYearFromNow = now.add({ years: 1 });
  // Add a new booking 70% of the time for all hotels.
  const shouldAddBooking = () =>
    faker.datatype.boolean({ probability: OCCUPANCY_RATE });
  // Use the same random guest function across all hotels.
  const getGuest = getRandomGuest(guests);

  // =====================
  // Write bookings to CSV
  // =====================

  const output = createWriteStream(path);

  async function write(chunk: string) {
    if (!output.write(chunk)) {
      await once(output, "drain");
    }
  }

  await write("hotel_id,guest_id,created_at,check_in,check_out\n");

  let bookingData: string[] = [];
  let count = 0;

  for (const hotel of hotels) {
    // Start over from 90 days in the past after each hotel
    const getCreatedAt = getCreatedAtDate(now.subtract({ days: 90 }));

    createBookingData({
      start: now,
      end: oneYearFromNow,
      hotel,
      shouldAddBooking,
      getLengthOfStay,
      getGuest,
      getCreatedAt,
    }).forEach((booking) => {
      bookingData.push(
        `${booking.hotelId},${booking.guestId},${booking.createdAt},${booking.checkIn},${booking.checkOut}`,
      );
    });

    if (bookingData.length > BOOKINGS_BUFFER) {
      count += bookingData.length;
      console.log(
        `Flushing bookings to disk | ${count} of ${APPROXIMATE_BOOKINGS}`,
      );
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

  await client.connect();

  const copyStream = client.query(
    copyFrom(`
      COPY bookings (
        hotel_id,
        guest_id,
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
