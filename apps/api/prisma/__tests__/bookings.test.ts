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
    const getCustomer = () => ({
      id: customerId,
    });
    const getCreatedAt = () => now;

    const bookingData = createBookingData({
      start: now,
      end: now,
      hotel: { id: hotelId, totalRooms: 1 },
      shouldAddBooking,
      getLengthOfStay,
      getCustomer,
      getCreatedAt,
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
    const getCustomer = () => ({
      id: customerId,
    });
    const getCreatedAt = () => now;

    const bookingData = createBookingData({
      start: now,
      end,
      hotel: { id: hotelId, totalRooms: 1 },
      shouldAddBooking,
      getLengthOfStay,
      getCustomer,
      getCreatedAt,
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

  // In this test there are 3 possible checkIn dates for 1 room.
  // Because each booking is for 2 days we can only accommodate 2 bookings.
  test("limit bookings by length of stay", () => {
    const now = Temporal.Now.plainDateISO();
    const end = now.add({ days: 2 });
    const hotelId = BigInt(1);
    const customerId = BigInt(1);
    const shouldAddBooking = () => true;
    const getLengthOfStay = () => 2;
    const getCustomer = () => ({
      id: customerId,
    });
    const getCreatedAt = () => now;

    const bookingData = createBookingData({
      start: now,
      end,
      hotel: { id: hotelId, totalRooms: 1 },
      shouldAddBooking,
      getLengthOfStay,
      getCustomer,
      getCreatedAt,
    });

    expect(bookingData).toHaveLength(2);

    expect(bookingData).toMatchObject([
      {
        hotelId,
        customerId,
        checkIn: now.toString(),
      },
      {
        hotelId,
        customerId,
        checkIn: now.add({ days: 2 }).toString(),
      },
    ]);
  });

  test("Add bookings for multiple rooms", () => {
    const now = Temporal.Now.plainDateISO();
    const end = now.add({ days: 2 });
    const hotelId = BigInt(1);
    const customerId1 = BigInt(1);
    const customerId2 = BigInt(2);
    const shouldAddBooking = () => true;
    const getLengthOfStay = () => 3;
    const getCustomer = (() => {
      let callCount = 0;

      return () => {
        const data = {
          id: callCount % 2 === 0 ? customerId1 : customerId2,
        };

        callCount++;

        return data;
      };
    })();
    const getCreatedAt = () => now;

    const bookingData = createBookingData({
      start: now,
      end,
      hotel: { id: hotelId, totalRooms: 2 },
      shouldAddBooking,
      getLengthOfStay,
      getCustomer,
      getCreatedAt,
    });

    expect(bookingData).toHaveLength(2);

    expect(bookingData).toMatchObject([
      {
        hotelId,
        customerId: customerId1,
        checkIn: now.toString(),
      },
      {
        hotelId,
        customerId: customerId2,
        checkIn: now.toString(),
      },
    ]);
  });
});
