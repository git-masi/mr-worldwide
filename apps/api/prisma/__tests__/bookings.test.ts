import { describe, test, expect } from "vitest";
import { createBookingData } from "../utils";
import { Temporal } from "temporal-polyfill";

describe("createBookingData", () => {
  test("create one booking", () => {
    const now = Temporal.Now.plainDateISO();
    const hotelId = BigInt(1);
    const customerId = BigInt(1);
    const shouldAddBooking = () => true;

    const bookingData = createBookingData({
      start: now,
      end: now,
      hotel: { id: hotelId, totalRooms: 1 },
      customers: [{ id: customerId }],
      shouldAddBooking,
    });

    expect(bookingData).toHaveLength(1);

    expect(bookingData[0]).toMatchObject({
      hotelId,
      customerId,
      checkIn: now.toString(),
    });
  });
});
