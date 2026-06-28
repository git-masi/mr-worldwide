import express from "express";
import morgan from "morgan";
import cors from "cors";
import * as v from "valibot";
import prisma from "./client";

const DateStringSchema = v.pipe(
  v.string(),
  v.isoDate("Invalid date format"),
  v.transform((input) => new Date(input)),
);

const AvailabilityQueryParamsSchema = v.object({
  checkIn: DateStringSchema,
  checkOut: DateStringSchema,
});

export function initServer() {
  const app = express();

  app
    .disable("x-powered-by")
    .use(morgan("dev"))
    .use(express.json())
    .use(cors());

  app.get("/ping", async (req, res) => {
    res.type("text/plain").send("pong");
  });

  app.get("/availability", async (req, res) => {
    try {
      const qp = v.parse(AvailabilityQueryParamsSchema, req.query);

      const hotels = await prisma.hotel.findMany();

      const bookings = await prisma.booking.findMany({
        where: {
          AND: [
            { checkIn: { lt: qp.checkOut } },
            { checkOut: { gt: qp.checkIn } },
          ],
        },
        select: { checkIn: true, checkOut: true, hotelId: true },
      });

      const hotelBookings = Object.groupBy(bookings, (booking) =>
        booking.hotelId.toString(),
      );

      const result = hotels
        .map((hotel) => {
          const hb = hotelBookings[hotel.id.toString()];

          return {
            name: hotel.name,
            id: hotel.id.toString(),
            availableRooms: hb
              ? hotel.totalRooms - roomsNeeded(hb)
              : hotel.totalRooms,
          };
        })
        .filter(Boolean);

      res.json(result);
    } catch (error) {
      console.log(error);

      if (v.isValiError(error)) {
        res.status(400).send(error.message);
      }

      res.status(500);
    }
  });

  return app;
}

// Subtract rooms needs from total rooms to get available rooms
export function roomsNeeded<T extends { checkIn: Date; checkOut: Date }>(
  bookings: T[],
): number {
  if (bookings.length < 2) {
    return bookings.length;
  }

  // consider using `sort` instead of `toSorted` if performance matters
  // additionally, if you are willing to trust sorting to the DB this becomes unnecessary
  const sortedBookings = bookings.toSorted(
    (a, b) => a.checkIn.getTime() - b.checkIn.getTime(),
  );
  const buckets: T[][] = [];

  for (const booking of sortedBookings) {
    const idx = buckets.findIndex((bucket) => {
      const lastBooking = bucket.at(-1);

      if (!lastBooking) {
        return false;
      }

      const isOnOrBefore =
        booking.checkIn.getTime() - lastBooking.checkOut.getTime() >= 0;

      return isOnOrBefore;
    });

    if (idx === -1) {
      buckets.push([booking]);
    } else {
      buckets[idx]!.push(booking);
    }
  }

  return buckets.length;
}
