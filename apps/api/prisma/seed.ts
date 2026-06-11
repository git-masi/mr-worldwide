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
  getLengthOfStay,
  getNextGuestId,
  isHighValueGuest,
  Rooms,
  useHighValueGuest,
} from "./utils";

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
const BASE_HIGH_VALUE_GUEST_PROBABILITY = 0.05;
const NUM_HIGH_VALUE_GUESTS = NUM_GUESTS * BASE_HIGH_VALUE_GUEST_PROBABILITY;
const BOOKINGS_BUFFER = 50_000;

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

type HotelWithRooms = {
  id: bigint;
  rooms: Rooms;
};

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

  const hotels = await createHotels();
  console.log(`✅ Created hotels`);

  await createGuestData(guestsPath);
  console.log(`✅ Created guests data`);

  createRecordsFromCsv(
    guestsPath,
    `
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
    `,
  );
  console.log(`✅ Created guests`);

  await createBookingData(bookingsPath, hotels);
  console.log(`✅ Created booking data`);

  await createRecordsFromCsv(
    bookingsPath,
    `
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
    `,
  );
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

async function createGuestData(path: string) {
  // Open stream to CSV to save guests
  const output = createWriteStream(path);

  async function write(chunk: string) {
    if (!output.write(chunk)) {
      await once(output, "drain");
    }
  }

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

    if (guestData.length > 10_000) {
      console.log(`Flushing guests to disk | ${count} of ${NUM_GUESTS}`);
      await write(guestData.join("\n") + "\n");
      // Reset the array so it can be reused
      guestData.length = 0;
    }
  }

  output.end();
  await once(output, "finish");
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

  // Open stream to CSV to save bookings
  const output = createWriteStream(path);

  async function write(chunk: string) {
    if (!output.write(chunk)) {
      await once(output, "drain");
    }
  }

  // Write CSV header
  await write("hotel_id,guest_id,check_in,check_out\n");

  const bookingData: string[] = [];
  // Count the bookings so that we have something to look at in the terminal :D
  let count = 0;

  // Create bookings for 1 year starting from now
  for (const daysPassed of range(NUM_DAYS_IN_YEAR)) {
    const currentDate = now.add({ days: daysPassed });

    await createBookingsForDate(
      currentDate,
      hotelsWithRooms,
      nextGuestId,
      bookingData,
    );

    count += bookingData.length;
    console.log(
      `Flushing bookings to disk | ${count} of ${APPROXIMATE_BOOKINGS}`,
    );

    await write(bookingData.join("\n") + "\n");
    // Reset the array so it can be reused
    bookingData.length = 0;
  }

  output.end();
  await once(output, "finish");
}

async function createBookingsForDate(
  currentDate: Temporal.PlainDate,
  hotelsWithRooms: HotelWithRooms[],
  nextGuestId: () => number,
  bookingData: string[],
) {
  const { availableHotels, hotelBookingAttemptCount } =
    getAvailableHotels(hotelsWithRooms);

  if (availableHotels.length < 1) {
    return;
  }

  let end = availableHotels.length - 1;

  while (end >= 0) {
    const idx = faker.number.int({ min: 0, max: end });
    const hotel = availableHotels[idx]!;
    const hotelIdStr = hotel.id.toString();

    hotelBookingAttemptCount[hotelIdStr]! -= 1;
    if (hotelBookingAttemptCount[hotelIdStr] === 0) {
      // Swap hotel to end to that it is out of bounds
      // @ts-ignore
      [availableHotels[idx], availableHotels[end]] = [
        availableHotels[end],
        availableHotels[idx],
      ];
      end--;
    }

    const shouldAddBooking = faker.datatype.boolean({
      probability: OCCUPANCY_RATE,
    });
    if (!shouldAddBooking) {
      continue;
    }

    const guestId = nextGuestId();
    const checkIn = currentDate.toPlainDateTime().toString();
    const checkOut = currentDate
      .add({ days: getLengthOfStay() })
      .toPlainDateTime()
      .toString();

    bookingData.push(`${hotel.id},${guestId},${checkIn},${checkOut}`);
  }
}

function getAvailableHotels(hotelsWithRooms: HotelWithRooms[]) {
  const availableHotels: HotelWithRooms[] = [];
  const hotelBookingAttemptCount: Record<string, number> = {};

  for (const hotel of hotelsWithRooms) {
    const numRoomsAvailable = hotel.rooms.getNumAvailableRooms();

    if (numRoomsAvailable > 0) {
      availableHotels.push(hotel);
      hotelBookingAttemptCount[hotel.id.toString()] = numRoomsAvailable;
    }
  }

  return { availableHotels, hotelBookingAttemptCount };
}

async function createRecordsFromCsv(path: string, query: string) {
  await pgClient.connect();

  const copyStream = pgClient.query(copyFrom(query));

  const fileStream = createReadStream(path);

  await new Promise((res, rej) => {
    fileStream.pipe(copyStream).on("finish", res).on("error", rej);

    fileStream.on("error", rej);
  });

  await pgClient.end();
}
