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

  app.get("/v1/availability", async (req, res) => {
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
      console.error(error);

      if (v.isValiError(error)) {
        res.status(400).send(error.message);
      }

      res.status(500);
    }
  });

  app.get("/v2/availability", async (req, res) => {
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
          ) ORDER BY b.check_in
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
        bookings: { checkIn: string; checkOut: string }[];
      }[];

      const result = hotelBookings.map((data) => ({
        name: data.hotel_name,
        id: data.hotel_id.toString(),
        availableRooms: data.total_rooms - roomsNeeded(data.bookings),
      }));

      res.json(result);
    } catch (error) {
      console.error(error);

      if (v.isValiError(error)) {
        res.status(400).send(error.message);
      }

      res.status(500);
    }
  });

  app.get("/v3/availability", async (req, res) => {
    try {
      const qp = v.parse(AvailabilityQueryParamsSchema, req.query);

      const availableRooms = (await prisma.$queryRaw`
WITH requested_dates AS (
    SELECT generate_series(
        ${qp.checkIn}::date,
        (${qp.checkOut}::date - INTERVAL '1 day'),
        INTERVAL '1 day'
    )::date AS booking_date
),
daily_hotel_usage AS (
    SELECT
        h.id AS hotel_id,
        h.name AS hotel_name,
        h.total_rooms,
        d.booking_date,
        COUNT(b.id) AS rooms_needed
    FROM hotels h
    CROSS JOIN requested_dates d
    LEFT JOIN bookings b
        ON b.hotel_id = h.id
        AND d.booking_date >= b.check_in
        AND d.booking_date < b.check_out
    GROUP BY
        h.id,
        h.name,
        h.total_rooms,
        d.booking_date
),
peak_usage AS (
    SELECT
        hotel_id,
        hotel_name,
        total_rooms,
        MAX(rooms_needed) AS max_rooms_required
    FROM daily_hotel_usage
    GROUP BY
        hotel_id,
        hotel_name,
        total_rooms
)
SELECT
    hotel_id::text AS id,
    hotel_name AS name,
    (total_rooms - max_rooms_required)::int AS "availableRooms"
FROM peak_usage
ORDER BY id;`) as {
        id: string;
        name: string;
        availableRooms: number;
      }[];

      res.json(availableRooms);
    } catch (error) {
      console.error(error);

      if (v.isValiError(error)) {
        res.status(400).send(error.message);
      }

      res.status(500);
    }
  });

  app.get("/v4/availability", async (req, res) => {
    try {
      const qp = v.parse(AvailabilityQueryParamsSchema, req.query);

      const availableRooms = (await prisma.$queryRaw`
WITH relevant_bookings AS (
    SELECT
        b.hotel_id,
        b.check_in,
        b.check_out
    FROM bookings b
    WHERE daterange(b.check_in, b.check_out, '[)')
        && daterange(${qp.checkIn}, ${qp.checkOut}, '[)')
),
event_points AS (
    SELECT
        hotel_id,
        check_in AS event_date,
        1 AS delta
    FROM relevant_bookings

    UNION ALL

    SELECT
        hotel_id,
        check_out AS event_date,
        -1 AS delta
    FROM relevant_bookings
),
occupancy AS (
    SELECT
        hotel_id,
        event_date,
        SUM(delta) OVER (
            PARTITION BY hotel_id
            ORDER BY event_date, delta ASC
        ) AS rooms_occupied
    FROM event_points
),
peak_usage AS (
    SELECT
        hotel_id,
        MAX(rooms_occupied) AS max_rooms_required
    FROM occupancy
    GROUP BY hotel_id
)
SELECT
    h.id,
    h.name,
    (h.total_rooms - COALESCE(p.max_rooms_required, 0))::int AS "availableRooms"
FROM hotels h
LEFT JOIN peak_usage p
    ON p.hotel_id = h.id
ORDER BY h.id;`) as {
        id: string;
        name: string;
        availableRooms: number;
      }[];

      res.json(availableRooms);
    } catch (error) {
      console.error(error);

      if (v.isValiError(error)) {
        res.status(400).send(error.message);
      }

      res.status(500);
    }
  });

  return app;
}
