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

  app.get("/availability/v2", async (req, res) => {
    try {
      const qp = v.parse(AvailabilityQueryParamsSchema, req.query);

      const hotelBookings = (await prisma.$queryRaw`
SELECT
  h.id AS hotel_id,
 	h.name AS hotel_name,
 	h.total_rooms AS total_rooms,
  COALESCE(
      json_agg(
          json_build_object(
              'checkIn', b.check_in,
              'checkOut', b.check_out
          )
      ) FILTER (
        WHERE b.id IS NOT NULL
      ),
      '[]'::json
  ) AS bookings
FROM hotels h
LEFT JOIN bookings b
    ON b.hotel_id = h.id
   	AND b.check_in < ${qp.checkOut}
   	AND b.check_out > ${qp.checkIn}
GROUP BY h.id
ORDER BY h.id;`) as {
        hotel_id: bigint;
        hotel_name: string;
        total_rooms: number;
        bookings: { checkIn: Date; checkOut: Date }[];
      }[];

      const result = hotelBookings.map((data) => ({
        name: data.hotel_name,
        id: data.hotel_id.toString(),
        availableRooms: data.total_rooms - roomsNeeded(data.bookings),
      }));

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
