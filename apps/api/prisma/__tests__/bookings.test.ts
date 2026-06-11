import { describe, test, expect } from "vitest";
import { createBookingData } from "../utils";
import { Temporal } from "temporal-polyfill";

describe("createBookingData", () => {
  test("create one booking", () => {
    const now = Temporal.Now.plainDateISO();
    const hotelId = BigInt(1);
    const guestId = BigInt(1);
    const shouldAddBooking = () => true;
    const getLengthOfStay = () => 1;
    const getGuest = () => ({
      id: guestId,
    });

    const bookingData = createBookingData({
      start: now,
      end: now,
      hotel: { id: hotelId, totalRooms: 1 },
      shouldAddBooking,
      getLengthOfStay,
      getGuest,
    });

    expect(bookingData).toHaveLength(1);

    expect(bookingData[0]).toMatchObject({
      hotelId,
      guestId,
      checkIn: now.toPlainDateTime().toString(),
    });
  });

  test("create multiple bookings", () => {
    const now = Temporal.Now.plainDateISO();
    const end = now.add({ days: 2 });
    const hotelId = BigInt(1);
    const guestId = BigInt(1);
    const shouldAddBooking = () => true;
    const getLengthOfStay = () => 1;
    const getGuest = () => ({
      id: guestId,
    });

    const bookingData = createBookingData({
      start: now,
      end,
      hotel: { id: hotelId, totalRooms: 1 },
      shouldAddBooking,
      getLengthOfStay,
      getGuest,
    });

    expect(bookingData).toHaveLength(3);

    expect(bookingData).toMatchObject([
      {
        hotelId,
        guestId,
        checkIn: now.toPlainDateTime().toString(),
      },
      {
        hotelId,
        guestId,
        checkIn: now.add({ days: 1 }).toPlainDateTime().toString(),
      },
      {
        hotelId,
        guestId,
        checkIn: now.add({ days: 2 }).toPlainDateTime().toString(),
      },
    ]);
  });

  // In this test there are 3 possible checkIn dates for 1 room.
  // Because each booking is for 2 days we can only accommodate 2 bookings.
  test("limit bookings by length of stay", () => {
    const now = Temporal.Now.plainDateISO();
    const end = now.add({ days: 2 });
    const hotelId = BigInt(1);
    const guestId = BigInt(1);
    const shouldAddBooking = () => true;
    const getLengthOfStay = () => 2;
    const getGuest = () => ({
      id: guestId,
    });

    const bookingData = createBookingData({
      start: now,
      end,
      hotel: { id: hotelId, totalRooms: 1 },
      shouldAddBooking,
      getLengthOfStay,
      getGuest,
    });

    expect(bookingData).toHaveLength(2);

    expect(bookingData).toMatchObject([
      {
        hotelId,
        guestId,
        checkIn: now.toPlainDateTime().toString(),
      },
      {
        hotelId,
        guestId,
        checkIn: now.add({ days: 2 }).toPlainDateTime().toString(),
      },
    ]);
  });

  test("Add bookings for multiple rooms", () => {
    const now = Temporal.Now.plainDateISO();
    const end = now.add({ days: 2 });
    const hotelId = BigInt(1);
    const guestId1 = BigInt(1);
    const guestId2 = BigInt(2);
    const shouldAddBooking = () => true;
    const getLengthOfStay = () => 3;
    const getGuest = (() => {
      let callCount = 0;

      return () => {
        const data = {
          id: callCount % 2 === 0 ? guestId1 : guestId2,
        };

        callCount++;

        return data;
      };
    })();

    const bookingData = createBookingData({
      start: now,
      end,
      hotel: { id: hotelId, totalRooms: 2 },
      shouldAddBooking,
      getLengthOfStay,
      getGuest,
    });

    expect(bookingData).toHaveLength(2);

    expect(bookingData).toMatchObject([
      {
        hotelId,
        guestId: guestId1,
        checkIn: now.toPlainDateTime().toString(),
      },
      {
        hotelId,
        guestId: guestId2,
        checkIn: now.toPlainDateTime().toString(),
      },
    ]);
  });
});
