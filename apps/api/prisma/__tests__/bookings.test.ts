import { describe, test, expect } from "vitest";
import { createBookingsForDate, Rooms } from "../utils";
import { Temporal } from "temporal-polyfill";
import { range } from "@repo/numbers/range";

describe("createBookingsForDate", () => {
  test("create one booking", { timeout: 1000 }, () => {
    const currentDate = Temporal.PlainDate.from("2026-01-01");
    const hotelsWithRooms = [
      { id: BigInt(1), totalRooms: 1, rooms: new Rooms(1) },
    ];
    const nextGuestId = () => 1;
    const bookingData: string[] = [];
    const occupancyRate = 1;

    createBookingsForDate({
      currentDate,
      hotelsWithRooms,
      nextGuestId,
      bookingData,
      occupancyRate,
    });

    expect(bookingData).toHaveLength(1);

    expect(bookingData[0]).toContain(`1,1,2026-01-01`);
  });

  test("create two bookings", { timeout: 1000 }, () => {
    const currentDate = Temporal.PlainDate.from("2026-01-01");
    const hotelsWithRooms = [
      { id: BigInt(1), totalRooms: 1, rooms: new Rooms(1) },
      { id: BigInt(2), totalRooms: 1, rooms: new Rooms(1) },
    ];
    const nextGuestId = () => 1;
    const bookingData: string[] = [];
    const occupancyRate = 1;

    createBookingsForDate({
      currentDate,
      hotelsWithRooms,
      nextGuestId,
      bookingData,
      occupancyRate,
    });

    expect(bookingData).toHaveLength(2);
  });

  test("create many bookings", { timeout: 1000 }, () => {
    const currentDate = Temporal.PlainDate.from("2026-01-01");
    const hotelsWithRooms = [
      { id: BigInt(1), totalRooms: 1, rooms: new Rooms(10) },
      { id: BigInt(2), totalRooms: 1, rooms: new Rooms(10) },
    ];
    const nextGuestId = () => 1;
    const bookingData: string[] = [];
    const occupancyRate = 1;

    createBookingsForDate({
      currentDate,
      hotelsWithRooms,
      nextGuestId,
      bookingData,
      occupancyRate,
    });

    expect(bookingData).toHaveLength(20);
  });

  test(
    "create zero bookings if occupancy rate does not allow it",
    { timeout: 1000 },
    () => {
      const currentDate = Temporal.PlainDate.from("2026-01-01");
      const hotelsWithRooms = [
        { id: BigInt(1), totalRooms: 1, rooms: new Rooms(10) },
        { id: BigInt(2), totalRooms: 1, rooms: new Rooms(10) },
      ];
      const nextGuestId = () => 1;
      const bookingData: string[] = [];
      const occupancyRate = 0;

      createBookingsForDate({
        currentDate,
        hotelsWithRooms,
        nextGuestId,
        bookingData,
        occupancyRate,
      });

      expect(bookingData).toHaveLength(0);
    },
  );

  test("create zero bookings if hotel is full", { timeout: 1000 }, () => {
    const currentDate = Temporal.PlainDate.from("2026-01-01");
    const rooms = new Rooms(2);
    rooms.occupy(Temporal.PlainDate.from("2026-01-02"));
    rooms.occupy(Temporal.PlainDate.from("2026-01-03"));

    const hotelsWithRooms = [{ id: BigInt(1), totalRooms: 1, rooms }];
    const nextGuestId = () => 1;
    const bookingData: string[] = [];
    const occupancyRate = 1;

    createBookingsForDate({
      currentDate,
      hotelsWithRooms,
      nextGuestId,
      bookingData,
      occupancyRate,
    });

    expect(bookingData).toHaveLength(0);
  });

  test("create bookings over multiple days", { timeout: 1000 }, () => {
    const start = Temporal.PlainDate.from("2026-01-01");

    const rooms = new Rooms(1);
    rooms.occupy(start.add({ days: 1 }));

    const hotelsWithRooms = [{ id: BigInt(1), totalRooms: 1, rooms }];
    const nextGuestId = () => 1;
    const bookingData: string[] = [];
    const occupancyRate = 1;

    for (const daysPassed of range(2)) {
      const currentDate = start.add({ days: daysPassed });

      createBookingsForDate({
        currentDate,
        hotelsWithRooms,
        nextGuestId,
        bookingData,
        occupancyRate,
      });
    }

    expect(bookingData).toHaveLength(1);
  });
});
