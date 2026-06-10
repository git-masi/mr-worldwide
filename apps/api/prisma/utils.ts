/**






These are private functions, they are only used to see the database.
If you need to use these elsewhere for any reason it would be best to move them to a more
appropriate location like in a @repo package.






 */

import { MinHeap } from "@datastructures-js/heap";
import { faker } from "@faker-js/faker";
import { range } from "@repo/numbers/range";
import { Temporal } from "temporal-polyfill"; // Technically not needed for node v26
import { BookingCreateManyInput } from "./generated/models";

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

export function createBookingData(config: {
  start: Temporal.PlainDate;
  end: Temporal.PlainDate;
  hotel: { id: bigint; totalRooms: number };
  shouldAddBooking: () => boolean;
  getLengthOfStay: () => number;
  getCustomer: () => { id: bigint };
  getCreatedAt: (currentDate: Temporal.PlainDate) => Temporal.PlainDate;
}) {
  const {
    start,
    end,
    hotel,
    shouldAddBooking,
    getLengthOfStay,
    getCustomer,
    getCreatedAt,
  } = config;

  const bookingData: BookingCreateManyInput[] = [];

  const rooms = new Rooms(hotel.totalRooms);

  let currentDate = start;

  // Loop through each date from the current date to one year from now
  while (Temporal.PlainDate.compare(currentDate, end) <= 0) {
    // Free up rooms where the occupant is checking out on `currentDate`
    rooms.vacate(currentDate);

    for (const _ of range(rooms.getNumAvailableRooms())) {
      if (!shouldAddBooking()) {
        continue;
      }

      // Get a random customer
      const customer = getCustomer();

      const createdAt = getCreatedAt(currentDate);

      // Add the number of nights to the current date to get the check out date
      const checkOut = currentDate.add({ days: getLengthOfStay() });

      // Add booking data to save to DB
      bookingData.push({
        hotelId: hotel.id,
        customerId: customer.id,
        createdAt: createdAt.toPlainDateTime().toString(),
        checkIn: currentDate.toPlainDateTime().toString(),
        checkOut: checkOut.toPlainDateTime().toString(),
      });

      // Mark room as taken
      rooms.occupy(checkOut);
    }

    currentDate = currentDate.add({ days: 1 });
  }

  return bookingData;
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

// The purpose of this function is to create a series of dates that are monotonically increasing
// unlike the `faker.date.recent`.
export function getCreatedAtDate(start: Temporal.PlainDate) {
  let createdAt: Temporal.PlainDate = start;

  const updateCreatedAt = (currentDate: Temporal.PlainDate) => {
    const { days: numDaysSincePrev } = currentDate.since(createdAt);

    // If it has been less than 10 days since the current date then we reuse the same created at date
    if (numDaysSincePrev < 10) {
      return;
    }

    // If it has been more than 90 days since the current date date then we increment created at by
    // some number of days between 1 and 10
    if (numDaysSincePrev > 90) {
      createdAt = createdAt.add({
        days: faker.number.int({ min: 1, max: 10 }),
      });
      return;
    }

    // As the created at date gets closer to the current date the probability of incrementing
    // the date decreases
    const shouldIncrement = faker.datatype.boolean({
      probability: Math.min(numDaysSincePrev / 100, 0.3),
    });

    if (!shouldIncrement) {
      return;
    }

    createdAt = createdAt.add({
      days: 1,
    });
  };

  return (currentDate: Temporal.PlainDate): Temporal.PlainDate => {
    updateCreatedAt(currentDate);

    return createdAt;
  };
}
