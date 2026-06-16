import { describe, test, expect } from "vitest";
import { createBookingsForDate, getAvailableHotels, Rooms } from "../utils";
import { Temporal } from "temporal-polyfill";
import { range } from "@repo/numbers/range";

describe("createBookingsForDate", () => {
  test("create one booking", () => {
    const currentDate = Temporal.PlainDate.from("2026-01-01");
    const rooms = new Rooms(1);
    const nextGuestId = () => 1;
    const getLengthOfStay = () => 1;

    function* getAvailableHotels() {
      yield { id: BigInt(1), totalRooms: 1, rooms };
    }

    const bookingData = createBookingsForDate({
      currentDate,
      nextGuestId,
      getLengthOfStay,
      availableHotels: getAvailableHotels(),
    });

    expect(bookingData).toHaveLength(1);

    const checkInString = currentDate.toPlainDateTime().toString();
    const checkOutString = currentDate
      .add({ days: 1 })
      .toPlainDateTime()
      .toString();

    expect(bookingData[0]).toEqual(`1,1,${checkInString},${checkOutString}`);

    expect(rooms.getNumAvailableRooms()).toEqual(0);
  });

  test("create two bookings for different hotels", () => {
    const currentDate = Temporal.PlainDate.from("2026-01-01");
    const hotelsWithRooms = [
      { id: BigInt(1), totalRooms: 1, rooms: new Rooms(1) },
      { id: BigInt(2), totalRooms: 1, rooms: new Rooms(1) },
    ];
    const nextGuestId = () => 1;
    const getLengthOfStay = () => 1;

    function* getAvailableHotels() {
      for (const hotel of hotelsWithRooms) {
        yield hotel;
      }
    }

    const bookingData = createBookingsForDate({
      currentDate,
      nextGuestId,
      getLengthOfStay,
      availableHotels: getAvailableHotels(),
    });

    expect(bookingData).toHaveLength(2);

    const checkInString = currentDate.toPlainDateTime().toString();
    const checkOutString = currentDate
      .add({ days: 1 })
      .toPlainDateTime()
      .toString();

    expect(bookingData).toMatchObject(
      expect.arrayContaining([
        expect.stringContaining(`1,1,${checkInString},${checkOutString}`),
        expect.stringContaining(`2,1,${checkInString},${checkOutString}`),
      ]),
    );
  });

  test("create many bookings", () => {
    const currentDate = Temporal.PlainDate.from("2026-01-01");
    const totalRooms = 10;
    const hotelsWithRooms = [
      { id: BigInt(1), totalRooms, rooms: new Rooms(totalRooms) },
      { id: BigInt(2), totalRooms, rooms: new Rooms(totalRooms) },
    ];
    const nextGuestId = () => 1;
    const getLengthOfStay = () => 1;

    function* getAvailableHotels() {
      for (const hotel of hotelsWithRooms) {
        for (const _ of range(totalRooms)) {
          yield hotel;
        }
      }
    }

    const bookingData = createBookingsForDate({
      currentDate,
      nextGuestId,
      getLengthOfStay,
      availableHotels: getAvailableHotels(),
    });

    expect(bookingData).toHaveLength(20);
  });

  test("create bookings over multiple days", () => {
    const start = Temporal.PlainDate.from("2026-01-01");

    const rooms = new Rooms(1);
    // The room is occupied on the first day
    rooms.occupy(start.add({ days: 1 }));

    const hotelsWithRooms = [{ id: BigInt(1), totalRooms: 1, rooms }];
    const nextGuestId = () => 1;
    const getLengthOfStay = () => 1;
    const shouldAddBooking = () => true;

    const bookingData: string[] = [];

    for (const daysPassed of range(2)) {
      // The room is free on day 2
      const currentDate = start.add({ days: daysPassed });

      bookingData.push(
        ...createBookingsForDate({
          currentDate,
          nextGuestId,
          getLengthOfStay,
          availableHotels: getAvailableHotels(
            currentDate,
            hotelsWithRooms,
            shouldAddBooking,
          ),
        }),
      );
    }

    expect(bookingData).toHaveLength(1);

    const checkInString = start.add({ days: 1 }).toPlainDateTime().toString();
    const checkOutString = start.add({ days: 2 }).toPlainDateTime().toString();

    expect(bookingData).toMatchObject([
      `1,1,${checkInString},${checkOutString}`,
    ]);
  });

  test("create consecutive bookings", () => {
    const start = Temporal.PlainDate.from("2026-01-01");
    const rooms = new Rooms(1);
    const hotelsWithRooms = [{ id: BigInt(1), totalRooms: 1, rooms }];

    const nextGuestId = () => 1;
    const getLengthOfStay = () => 1;
    const shouldAddBooking = () => true;

    const bookingData: string[] = [];

    for (const daysPassed of range(3)) {
      const currentDate = start.add({ days: daysPassed });

      bookingData.push(
        ...createBookingsForDate({
          currentDate,
          nextGuestId,
          getLengthOfStay,
          availableHotels: getAvailableHotels(
            currentDate,
            hotelsWithRooms,
            shouldAddBooking,
          ),
        }),
      );
    }

    expect(bookingData).toHaveLength(3);

    expect(bookingData).toMatchObject([
      `1,1,${start.toPlainDateTime().toString()},${start.add({ days: 1 }).toPlainDateTime().toString()}`,
      `1,1,${start.add({ days: 1 }).toPlainDateTime().toString()},${start.add({ days: 2 }).toPlainDateTime().toString()}`,
      `1,1,${start.add({ days: 2 }).toPlainDateTime().toString()},${start.add({ days: 3 }).toPlainDateTime().toString()}`,
    ]);
  });
}, 5000);
