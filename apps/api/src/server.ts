import express from "express";
import morgan from "morgan";
import cors from "cors";
import * as v from "valibot";
import prisma from "./client";
import { roomsNeeded } from "./rooms";

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
