/**






These are private functions, they are only used to seed the database.
If you need to use these elsewhere for any reason it would be best to move them to a more
appropriate location like in a @repo package.






 */

import { MinHeap } from "@datastructures-js/heap";
import { faker } from "@faker-js/faker";
import { range, rangeForever } from "@repo/numbers/range";
import { Temporal } from "temporal-polyfill"; // Technically not needed for node v26

export class Rooms {
  heap: MinHeap<Temporal.PlainDate>;
  totalRooms: number;

  constructor(totalRooms: number) {
    if (totalRooms < 1) {
      throw new Error("Must have 1 or more rooms");
    }
    this.totalRooms = totalRooms;
    this.heap = new MinHeap<Temporal.PlainDate>((date) => date.toString());
  }

  vacate(currentDate: Temporal.PlainDate) {
    let root = this.heap.root();
    while (
      root !== null &&
      Temporal.PlainDate.compare(currentDate, root) >= 0
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

    this.heap.push(checkOut);
  }

  getNumAvailable() {
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

export class HighValueGuests {
  private guests: number[];
  private end: number;
  private checkIn: string;

  constructor() {
    this.guests = [];
    this.end = this.guests.length - 1;
    this.checkIn = "";
  }

  add(id: number, checkIn: string): void {
    // Add to the pool of guests but do not make ID available until the next day
    this.guests.push(id);
    if (this.checkIn === "") {
      this.checkIn = checkIn;
    }
  }

  next(checkIn: string): number | null {
    if (this.checkIn != checkIn) {
      this.checkIn = checkIn;
      // Reset the window if we are dealing with a new `checkIn` date
      this.end = this.guests.length - 1;
    }

    if (this.guests.length === 0 || this.end < 0) {
      return null;
    }

    const idx = faker.number.int({ min: 0, max: this.end });

    const guestId = this.guests[idx];
    if (!guestId) {
      return null;
    }

    // Swap the guest ID so that it is out of bounds
    swap(this.guests, idx, this.end);

    // Shrink the window
    this.end--;

    return guestId;
  }

  getNumAvailable(): number {
    return this.end + 1;
  }
}

function swap(arr: unknown[], i: number, j: number): void {
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

// This function generates guest IDs with some probability of returning a previously used ID
// if the guest was a "high value" guest.
// High value guests are guests that we want to use in many bookings.
export function getNextGuestId(config: {
  totalGuests: number;
  useHighValueGuest: (poolSize: number) => boolean;
  isHighValueGuest: () => boolean;
}): (currentDate: string) => number {
  const { totalGuests, useHighValueGuest, isHighValueGuest } = config;

  const highValueGuests = new HighValueGuests();
  const guestIds = rangeForever(totalGuests);

  return function (currentDate: string) {
    if (useHighValueGuest(highValueGuests.getNumAvailable())) {
      const guestId = highValueGuests.next(currentDate);

      if (guestId) {
        return guestId;
      }
    }

    const guestId = guestIds.next().value + 1;

    // Determine if guest should become a high value guest
    if (isHighValueGuest()) {
      highValueGuests.add(guestId, currentDate);
    }

    return guestId;
  };
}

export function useHighValueGuest(
  numHighValueGuests: number,
  baseHighValueGuestProbability: number,
): (poolSize: number) => boolean {
  return function (poolSize: number) {
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
  return function () {
    return faker.datatype.boolean(highValueGuestProbability);
  };
}

export function createBookingsForDate(config: {
  currentDate: Temporal.PlainDate;
  nextGuestId: (currentDate: string) => number;
  getLengthOfStay: () => number;
  availableHotels: Iterable<HotelWithRooms>;
}): string[] {
  const { currentDate, nextGuestId, getLengthOfStay, availableHotels } = config;

  const checkIn = currentDate.toPlainDateTime().toString();
  const bookingData: string[] = [];

  for (const hotel of availableHotels) {
    const guestId = nextGuestId(checkIn);
    const futureDate = currentDate.add({ days: getLengthOfStay() });
    const checkOut = futureDate.toPlainDateTime().toString();

    // `rooms.occupy` mutates the data in `rooms`
    hotel.rooms.occupy(futureDate);

    bookingData.push(`${hotel.id},${guestId},${checkIn},${checkOut}`);
  }

  return bookingData;
}

export function* getAvailableHotels(
  currentDate: Temporal.PlainDate,
  hotelsWithRooms: HotelWithRooms[],
  shouldAddBooking: () => boolean,
): Iterable<HotelWithRooms, void> {
  const availableHotels: HotelWithRooms[] = [];

  for (const hotel of hotelsWithRooms) {
    // `rooms.vacate` mutates the data in `rooms`
    hotel.rooms.vacate(currentDate);

    for (const _ of range(hotel.rooms.getNumAvailable())) {
      if (shouldAddBooking()) {
        availableHotels.push(hotel);
      }
    }
  }

  // Randomize the hotels
  faker.helpers.shuffle(availableHotels, { inplace: true });

  while (availableHotels.length > 0) {
    yield availableHotels.pop()!;
  }
}
