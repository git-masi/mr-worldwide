import { Temporal } from "temporal-polyfill";
import { describe, test, expect } from "vitest";
import { getAvailableHotels, Rooms } from "../utils";
import { range } from "@repo/numbers/range";

describe("getAvailableHotels", () => {
  test("return 1 hotel", () => {
    const currentDate = Temporal.PlainDate.from("2026-01-01");
    const rooms = new Rooms(1);
    const hotelsWithRooms = [{ id: BigInt(1), totalRooms: 1, rooms }];
    const shouldAddBooking = () => true;

    const result = [
      ...getAvailableHotels(currentDate, hotelsWithRooms, shouldAddBooking),
    ];

    expect(result).toHaveLength(1);

    expect(result).toMatchObject(hotelsWithRooms);
  });

  test("return the same hotel twice", () => {
    const currentDate = Temporal.PlainDate.from("2026-01-01");
    const rooms = new Rooms(2);
    const hotel = { id: BigInt(1), totalRooms: 2, rooms };
    const hotelsWithRooms = [hotel];
    const shouldAddBooking = () => true;

    const result = [
      ...getAvailableHotels(currentDate, hotelsWithRooms, shouldAddBooking),
    ];

    expect(result).toHaveLength(2);

    expect(result).toMatchObject([hotel, hotel]);
  });

  test("return the hotel up to n times where n is the number of available rooms", () => {
    const currentDate = Temporal.PlainDate.from("2026-01-01");

    const rooms = new Rooms(10);
    // 6 of 10 rooms are occupied
    rooms.occupy(currentDate.add({ days: 2 }));
    rooms.occupy(currentDate.add({ days: 2 }));
    rooms.occupy(currentDate.add({ days: 2 }));
    rooms.occupy(currentDate.add({ days: 2 }));
    rooms.occupy(currentDate.add({ days: 2 }));
    rooms.occupy(currentDate.add({ days: 2 }));

    const hotel = { id: BigInt(1), totalRooms: 10, rooms };
    const hotelsWithRooms = [hotel];
    const shouldAddBooking = () => true;

    const result = [
      ...getAvailableHotels(currentDate, hotelsWithRooms, shouldAddBooking),
    ];

    // 10 - 6 = 4 rooms available
    expect(result).toHaveLength(4);
  });

  test("vacate rooms to increase the number of available rooms", () => {
    const currentDate = Temporal.PlainDate.from("2026-01-01");

    const totalRooms = 7;
    const rooms = new Rooms(totalRooms);
    // All rooms are occupied.
    // However, because the `checkOut` date is the `currentDate` the rooms will be vacated when we call `getAvailableHotels`
    for (const _ of range(totalRooms)) {
      rooms.occupy(currentDate);
    }

    const hotel = { id: BigInt(1), totalRooms: totalRooms, rooms };
    const hotelsWithRooms = [hotel];
    const shouldAddBooking = () => true;

    const result = [
      ...getAvailableHotels(currentDate, hotelsWithRooms, shouldAddBooking),
    ];

    // All rooms are vacated
    expect(result).toHaveLength(7);
  });

  test("do not return hotel if shouldAddBooking is false", () => {
    const currentDate = Temporal.PlainDate.from("2026-01-01");
    const rooms = new Rooms(1);
    const hotel = { id: BigInt(1), totalRooms: 1, rooms };
    const hotelsWithRooms = [hotel];
    const shouldAddBooking = () => false;

    const result = [
      ...getAvailableHotels(currentDate, hotelsWithRooms, shouldAddBooking),
    ];

    expect(result).toHaveLength(0);
  });

  test("return a number of hotels equal to the shouldAddBooking probability", () => {
    const currentDate = Temporal.PlainDate.from("2026-01-01");
    const rooms = new Rooms(6);
    const hotel = { id: BigInt(1), totalRooms: 6, rooms };
    const hotelsWithRooms = [hotel];
    const shouldAddBooking = (() => {
      let count = 0;

      return () => {
        // This mimics a probability of 33%
        const result = count % 3 === 0;
        count++;
        return result;
      };
    })();

    const result = [
      ...getAvailableHotels(currentDate, hotelsWithRooms, shouldAddBooking),
    ];

    expect(result).toHaveLength(2);
  });

  test("return 3 different hotels", () => {
    const currentDate = Temporal.PlainDate.from("2026-01-01");
    const hotel1 = { id: BigInt(1), totalRooms: 1, rooms: new Rooms(1) };
    const hotel2 = { id: BigInt(2), totalRooms: 1, rooms: new Rooms(1) };
    const hotel3 = { id: BigInt(3), totalRooms: 1, rooms: new Rooms(1) };
    const hotelsWithRooms = [hotel1, hotel2, hotel3];
    const shouldAddBooking = () => true;

    const result = [
      ...getAvailableHotels(currentDate, hotelsWithRooms, shouldAddBooking),
    ];

    expect(result).toHaveLength(3);

    expect(result).toMatchObject(
      expect.arrayContaining([hotel1, hotel2, hotel3]),
    );
  });
});
