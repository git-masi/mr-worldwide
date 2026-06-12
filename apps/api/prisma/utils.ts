/**






These are private functions, they are only used to seed the database.
If you need to use these elsewhere for any reason it would be best to move them to a more
appropriate location like in a @repo package.






 */

import { MinHeap } from "@datastructures-js/heap";
import { faker } from "@faker-js/faker";
import { range } from "@repo/numbers/range";
import { Temporal } from "temporal-polyfill"; // Technically not needed for node v26

type Checkout = { checkOut: string };

export class Rooms {
  heap: MinHeap<Checkout>;
  totalRooms: number;

  constructor(totalRooms: number) {
    if (totalRooms < 1) {
      throw new Error("Must have 1 or more rooms");
    }
    this.totalRooms = totalRooms;
    this.heap = new MinHeap<Checkout>((booking) => booking.checkOut);
  }

  vacate(currentDate: Temporal.PlainDate) {
    let root = this.heap.root();
    while (
      root !== null &&
      Temporal.PlainDate.compare(
        currentDate,
        Temporal.PlainDate.from(root.checkOut),
      ) >= 0
    ) {
      this.heap.pop();
      root = this.heap.root();
    }
  }

  occupy(checkOut: Temporal.PlainDate) {
    // If all the rooms are full return early.
    if (this.heap.size() === this.totalRooms) {
      return;
    }

    this.heap.push({
      checkOut: checkOut.toString(),
    });
  }

  getNumAvailableRooms() {
    return this.totalRooms - this.heap.size();
  }
}

export type HotelWithRooms = {
  id: bigint;
  rooms: Rooms;
};

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

export function getLengthOfStay(): number {
  // Get a random weighted number of nights for the stay
  return faker.helpers.weightedArrayElement(weightedLengthOfStay);
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

export function getHotelName(): string {
  const name = faker.helpers.arrayElement(hotelNames);
  const location = faker.helpers.arrayElement(hotelLocationFns)();

  return `${name} ${location}`;
}

// This function generates guest IDs with some probability of returning a previously used ID
// if the guest was a "high value" guest.
// High value guests are guests that we want to use in many bookings.
export function getNextGuestId(config: {
  totalGuests: number;
  useHighValueGuest: (poolSize: number) => boolean;
  isHighValueGuest: () => boolean;
}) {
  const { totalGuests, useHighValueGuest, isHighValueGuest } = config;
  const gen = range(totalGuests);
  const highValueGuests: number[] = [];
  const seen: Record<string, Set<number>> = {};

  return (currentDate: Temporal.PlainDate) => {
    const guestsSeen = (seen[currentDate.toString()] ??= new Set<number>());

    if (useHighValueGuest(highValueGuests.length)) {
      const highValueGuestsNotSeen = highValueGuests.filter(
        (id) => !guestsSeen.has(id),
      );
      if (highValueGuestsNotSeen.length > 0) {
        return faker.helpers.arrayElement(highValueGuestsNotSeen);
      }
    }

    const value = gen.next().value;

    // Fall back to a high value guest ID if there are no new guest IDs to generate
    if (typeof value !== "number") {
      if (highValueGuests.length < 1) {
        throw new Error(
          "Cannot generate new guest ID nor get high value guest ID",
        );
      }

      return faker.helpers.arrayElement(highValueGuests);
    }

    const guestId = value + 1;

    // Determine if guest should become a high value guest
    if (isHighValueGuest()) {
      guestsSeen.add(guestId);
      highValueGuests.push(guestId);
    }

    return guestId;
  };
}

export function useHighValueGuest(
  numHighValueGuests: number,
  baseHighValueGuestProbability: number,
): (poolSize: number) => boolean {
  return (poolSize: number) => {
    // As the pool of high value increases so too will this number
    const currentFractionOfHighValueGuests = poolSize / numHighValueGuests;

    // Select the smaller probability between the current fraction and the baseline
    // This means that we are less likely to select high value customers early on when creating bookings
    const highValueGuestProbability = Math.min(
      currentFractionOfHighValueGuests,
      baseHighValueGuestProbability,
    );

    return poolSize > 0 && faker.datatype.boolean(highValueGuestProbability);
  };
}

export function isHighValueGuest(
  highValueGuestProbability: number,
): () => boolean {
  return () => faker.datatype.boolean(highValueGuestProbability);
}

export function createBookingsForDate(config: {
  currentDate: Temporal.PlainDate;
  hotelsWithRooms: HotelWithRooms[];
  bookingData: string[];
  shouldAddBooking: () => boolean;
  nextGuestId: (currentDate: Temporal.PlainDate) => number;
  getLengthOfStay: () => number;
}) {
  const {
    currentDate,
    hotelsWithRooms,
    nextGuestId,
    bookingData,
    shouldAddBooking,
    getLengthOfStay,
  } = config;

  for (const hotel of getAvailableHotels(currentDate, hotelsWithRooms)) {
    if (!shouldAddBooking()) {
      continue;
    }

    const guestId = nextGuestId(currentDate);
    const checkIn = currentDate.toPlainDateTime().toString();
    const futureDate = currentDate.add({ days: getLengthOfStay() });
    const checkOut = futureDate.toPlainDateTime().toString();

    // `rooms.occupy` mutates the data in `rooms`
    hotel.rooms.occupy(futureDate);

    bookingData.push(`${hotel.id},${guestId},${checkIn},${checkOut}`);
  }
}

function* getAvailableHotels(
  currentDate: Temporal.PlainDate,
  hotelsWithRooms: HotelWithRooms[],
) {
  let availableHotels = hotelsWithRooms.filter((hotel) => {
    // `rooms.vacate` mutates the data in `rooms`
    hotel.rooms.vacate(currentDate);
    return hotel.rooms.getNumAvailableRooms() > 0;
  });

  const hotelBookingAttemptCount: Record<string, number> = Object.fromEntries(
    availableHotels.map((hotel) => [
      hotel.id.toString(),
      hotel.rooms.getNumAvailableRooms(),
    ]),
  );

  while (availableHotels.length > 0) {
    const hotel = faker.helpers.arrayElement(availableHotels);
    const hotelIdStr = hotel.id.toString();

    hotelBookingAttemptCount[hotelIdStr]! -= 1;

    if (hotelBookingAttemptCount[hotelIdStr] === 0) {
      availableHotels = availableHotels.filter((h) => h.id !== hotel.id);
    }

    yield hotel;
  }
}
