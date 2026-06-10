import { describe, test, expect } from "vitest";
import { createBookingData } from "../utils";
import { Temporal } from "temporal-polyfill";

describe("createBookingData", () => {
  test("create one booking", () => {
    const now = Temporal.Now.plainDateISO();
    const hotelId = BigInt(1);
    const customerId = BigInt(1);
    const shouldAddBooking = () => true;
    const getLengthOfStay = () => 1;

    const bookingData = createBookingData({
      start: now,
      end: now,
      hotel: { id: hotelId, totalRooms: 1 },
      customers: [{ id: customerId }],
      shouldAddBooking,
      getLengthOfStay,
    });

    expect(bookingData).toHaveLength(1);

    expect(bookingData[0]).toMatchObject({
      hotelId,
      customerId,
      checkIn: now.toString(),
    });
  });

  test("create multiple bookings", () => {
    const now = Temporal.Now.plainDateISO();
    const end = now.add({ days: 2 });
    const hotelId = BigInt(1);
    const customerId = BigInt(1);
    const shouldAddBooking = () => true;
    const getLengthOfStay = () => 1;

    const bookingData = createBookingData({
      start: now,
      end,
      hotel: { id: hotelId, totalRooms: 1 },
      customers: [{ id: customerId }],
      shouldAddBooking,
      getLengthOfStay,
    });

    expect(bookingData).toHaveLength(3);

    expect(bookingData).toMatchObject([
      {
        hotelId,
        customerId,
        checkIn: now.toString(),
      },
      {
        hotelId,
        customerId,
        checkIn: now.add({ days: 1 }).toString(),
      },
      {
        hotelId,
        customerId,
        checkIn: now.add({ days: 2 }).toString(),
      },
    ]);
  });
});
