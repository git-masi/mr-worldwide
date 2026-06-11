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
  getHotelName,
  createBookingsForDate,
  getNextGuestId,
  isHighValueGuest,
  Rooms,
  useHighValueGuest,
  getLengthOfStay,
  type HotelWithRooms,
} from "./utils";

const NUM_DAYS_IN_YEAR = 365;
const NUM_HOTELS = 500;
const MIN_HOTEL_ROOMS = 10;
const MAX_HOTEL_ROOMS = 100;
const APPROXIMATE_AVERAGE_HOTEL_ROOMS = Math.ceil(
  (MAX_HOTEL_ROOMS + MIN_HOTEL_ROOMS) / 2,
);
const OCCUPANCY_RATE = 0.7;
// sum of each length of stay * it's weight / sum of weights
// (10×1+15×2+25×3+20×4+20×5+5×6+5×7) / (10+15+25+20+20+5+5)
const WEIGHTED_AVERAGE_NIGHTS = 3.6;
// We use a formula to estimate the number of bookings we will have.
// This is useful for determining how many guests we will need.
// (500 * 55 * 365 * .7) / 3.6 = 1,951,736
// From experience the number of bookings produced is closer to 2.4 million
const APPROXIMATE_BOOKINGS = Math.ceil(
  (NUM_HOTELS *
    APPROXIMATE_AVERAGE_HOTEL_ROOMS *
    NUM_DAYS_IN_YEAR *
    OCCUPANCY_RATE) /
    WEIGHTED_AVERAGE_NIGHTS,
);
// Calculate number of guests based on expected bookings to ensure a large pool available
const NUM_GUESTS = Math.ceil(APPROXIMATE_BOOKINGS / 2);
const BASE_HIGH_VALUE_GUEST_PROBABILITY = 0.05;
const NUM_HIGH_VALUE_GUESTS = NUM_GUESTS * BASE_HIGH_VALUE_GUEST_PROBABILITY;

const COPY_BOOKINGS_QUERY = `
  COPY bookings (
    hotel_id,
    guest_id,
    check_in,
    check_out
  )
  FROM STDIN
  WITH (
    FORMAT csv,
    HEADER true
  )
`;

const COPY_GUESTS_QUERY = `
  COPY guests (
    first_name,
    last_name,
    email
  )
  FROM STDIN
  WITH (
    FORMAT csv,
    HEADER true
  )
`;

const postgresUser = process.env.POSTGRES_USER;
const postgresPassword = process.env.POSTGRES_PASSWORD;
const postgresDb = process.env.POSTGRES_DB;
const dbUrl = process.env.DATABASE_URL;

if (!postgresUser || !postgresPassword || !postgresDb || !dbUrl) {
  throw new Error(`Missing one or more env vars`);
}

const pgClient = new pg.Client({
  host: "localhost",
  port: 5432,
  user: postgresUser,
  password: postgresPassword,
  database: postgresDb,
});

const adapter = new PrismaPg({
  connectionString: dbUrl,
});

const prisma = new PrismaClient({ adapter });

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
  const guestsPath = `${dir}/guests.csv`;
  const bookingsPath = `${dir}/bookings.csv`;

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const numExistingUsers = await prisma.guest.count();

  await prisma.booking.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.guest.deleteMany();

  if (numExistingUsers > 0) {
    // Restart user IDs at 1 to ensure user selection works as expected.
    prisma.$executeRawUnsafe(
      `ALTER TABLE guests ALTER COLUMN id RESTART WITH 1;`,
    );
  }

  await pgClient.connect();

  const hotels = await createHotels();
  console.log(`✅ Created hotels`);

  await createGuestData(guestsPath);
  console.log(`✅ Created guests data`);

  createRecordsFromCsv(guestsPath, COPY_GUESTS_QUERY);
  console.log(`✅ Created guests`);

  await createBookingData(bookingsPath, hotels);
  console.log(`✅ Created booking data`);

  await createRecordsFromCsv(bookingsPath, COPY_BOOKINGS_QUERY);
  console.log(`✅ Created bookings`);

  await pgClient.end();
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

function getStreamWriter(path: string) {
  const output = createWriteStream(path);

  const write = async (chunk: string) => {
    if (!output.write(chunk)) {
      await once(output, "drain");
    }
  };

  const end = async () => {
    output.end();
    await once(output, "finish");
  };

  return { write, end };
}

async function createGuestData(path: string) {
  // Open a writable stream to CSV to save guests
  const { write, end } = getStreamWriter(path);

  // Write CSV header
  await write("first_name,last_name,email\n");

  const guestData: string[] = [];
  // Count the guests so that we have something to look at in the terminal :D
  let count = 0;

  for (const _ of range(NUM_GUESTS)) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({
      firstName,
      lastName,
    });

    count++;
    guestData.push(`${firstName},${lastName},${email}`);

    // Flush chunks of data to disk
    if (guestData.length > 25_000) {
      console.log(`Flushing guests to disk | ${count} of ${NUM_GUESTS}`);
      await write(guestData.join("\n") + "\n");
      // Reset the array so it can be reused
      guestData.length = 0;
    }
  }

  // Flush any remaining data
  if (guestData.length > 0) {
    console.log(`Flushing guests to disk | ${count} of ${NUM_GUESTS}`);
    await write(guestData.join("\n") + "\n");
  }

  await end();
}

async function createBookingData(
  path: string,
  hotels: { id: bigint; totalRooms: number }[],
) {
  const nextGuestId = getNextGuestId({
    totalGuests: NUM_GUESTS,
    isHighValueGuest: isHighValueGuest(BASE_HIGH_VALUE_GUEST_PROBABILITY),
    useHighValueGuest: useHighValueGuest(
      NUM_HIGH_VALUE_GUESTS,
      BASE_HIGH_VALUE_GUEST_PROBABILITY,
    ),
  });

  const hotelsWithRooms: HotelWithRooms[] = hotels.map((h) => ({
    id: h.id,
    rooms: new Rooms(h.totalRooms),
  }));

  const now = Temporal.Now.plainDateISO();

  // Open writable stream to CSV to save bookings
  const { write, end } = getStreamWriter(path);

  // Write CSV header
  await write("hotel_id,guest_id,check_in,check_out\n");

  const bookingData: string[] = [];
  // Count the bookings so that we have something to look at in the terminal :D
  let count = 0;

  // Create bookings for 1 year starting from now
  for (const daysPassed of range(NUM_DAYS_IN_YEAR)) {
    const currentDate = now.add({ days: daysPassed });

    createBookingsForDate({
      currentDate,
      hotelsWithRooms,
      bookingData,
      occupancyRate: OCCUPANCY_RATE,
      nextGuestId,
      getLengthOfStay,
    });

    count += bookingData.length;
    console.log(
      `Flushing bookings to disk | ${count} of ~${APPROXIMATE_BOOKINGS}`,
    );

    await write(bookingData.join("\n") + "\n");
    // Reset the array so it can be reused
    bookingData.length = 0;
  }

  end();
}

async function createRecordsFromCsv(path: string, query: string) {
  const copyStream = pgClient.query(copyFrom(query));

  const fileStream = createReadStream(path);

  await new Promise((res, rej) => {
    fileStream.pipe(copyStream).on("finish", res).on("error", rej);

    fileStream.on("error", rej);
  });

  fileStream.close();
}
