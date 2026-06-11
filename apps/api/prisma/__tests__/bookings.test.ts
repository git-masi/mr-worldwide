import { describe, test, expect } from "vitest";
import { createBookingsForDate, Rooms } from "../utils";
import { Temporal } from "temporal-polyfill";

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
  });
});
