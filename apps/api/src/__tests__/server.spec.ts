import request from "supertest";
import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { initServer } from "../server";
import prisma from "../client";
import { faker } from "@faker-js/faker";

describe("server integration tests", () => {
  const server = initServer();

  const paths = [
    "/v1/availability",
    "/v2/availability",
    "/v3/availability",
    "/v4/availability",
  ];

  paths.forEach((path) => {
    describe(`testing path: ${path}`, () => {
      beforeEach(async () => {
        await prisma.$executeRawUnsafe(
          `TRUNCATE TABLE "hotels", "guests", "bookings" CASCADE;`,
        );
      });

      afterAll(async () => {
        await prisma.$disconnect();
      });

      test("return status 200", async () => {
        const res = await request(server)
          .get(path)
          .query({ checkIn: "2026-01-01", checkOut: "2026-01-02" });

        expect(res.status).toEqual(200);
      });

      test("return 1 room available", async () => {
        const hotelName = "test hotel";
        const checkIn = "2026-01-01";
        const checkOut = "2026-01-05";

        const { id: hotelId } = await prisma.hotel.create({
          data: {
            name: hotelName,
            totalRooms: 2,
          },
          select: { id: true },
        });

        const { id: guestId } = await prisma.guest.create({
          data: {
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            email: faker.internet.email(),
          },
          select: { id: true },
        });

        await prisma.booking.create({
          data: {
            hotelId,
            guestId,
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
          },
        });

        const res = await request(server)
          .get(path)
          .query({ checkIn: checkIn, checkOut: checkOut });

        expect(res.status).toEqual(200);

        expect(res.body).toMatchObject([
          expect.objectContaining({
            name: hotelName,
            id: hotelId.toString(),
            availableRooms: 1,
          }),
        ]);
      });

      test("return 2 rooms available", async () => {
        const hotelName = "test hotel";
        const checkIn = "2026-01-01";
        const checkOut = "2026-01-05";

        const { id: hotelId } = await prisma.hotel.create({
          data: {
            name: hotelName,
            totalRooms: 2,
          },
          select: { id: true },
        });

        const res = await request(server)
          .get(path)
          .query({ checkIn: checkIn, checkOut: checkOut });

        expect(res.status).toEqual(200);

        expect(res.body).toMatchObject([
          expect.objectContaining({
            name: hotelName,
            id: hotelId.toString(),
            availableRooms: 2,
          }),
        ]);
      });

      test("return 0 rooms available", async () => {
        const hotelName = "test hotel";
        const checkIn = "2026-01-01";
        const checkOut = "2026-01-05";

        const { id: hotelId } = await prisma.hotel.create({
          data: {
            name: hotelName,
            totalRooms: 2,
          },
          select: { id: true },
        });

        const { id: guestId } = await prisma.guest.create({
          data: {
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            email: faker.internet.email(),
          },
          select: { id: true },
        });

        const booking = {
          hotelId,
          guestId,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
        };

        await prisma.booking.createMany({
          data: [booking, booking],
        });

        const res = await request(server)
          .get(path)
          .query({ checkIn: checkIn, checkOut: checkOut });

        expect(res.status).toEqual(200);

        expect(res.body).toMatchObject([
          expect.objectContaining({
            name: hotelName,
            id: hotelId.toString(),
            availableRooms: 0,
          }),
        ]);
      });

      test("return results for multiple hotels", async () => {
        const hotel1Name = faker.company.name();
        const hotel2Name = faker.company.name();
        const hotel3Name = faker.company.name();
        const checkIn = "2026-01-01";
        const checkOut = "2026-01-05";

        const [{ id: hotel1Id }, { id: hotel2Id }, { id: hotel3Id }] =
          await prisma.hotel.createManyAndReturn({
            data: [
              {
                name: hotel1Name,
                totalRooms: 2,
              },
              {
                name: hotel2Name,
                totalRooms: 2,
              },
              {
                name: hotel3Name,
                totalRooms: 10,
              },
            ],
            select: { id: true },
          });

        const { id: guestId } = await prisma.guest.create({
          data: {
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            email: faker.internet.email(),
          },
          select: { id: true },
        });

        const baseBooking = {
          guestId,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
        };

        await prisma.booking.createMany({
          data: [
            // 1 booking for hotel 1
            {
              ...baseBooking,
              hotelId: hotel1Id,
            },
            // 2 bookings for hotel 2
            {
              ...baseBooking,
              hotelId: hotel2Id,
            },
            {
              ...baseBooking,
              hotelId: hotel2Id,
            },
            // 1 booking for hotel 3
            {
              ...baseBooking,
              hotelId: hotel3Id,
            },
          ],
        });

        const res = await request(server)
          .get(path)
          .query({ checkIn: checkIn, checkOut: checkOut });

        expect(res.status).toEqual(200);

        expect(res.body).toMatchObject(
          expect.arrayContaining([
            expect.objectContaining({
              name: hotel1Name,
              id: hotel1Id.toString(),
              availableRooms: 1,
            }),
            expect.objectContaining({
              name: hotel2Name,
              id: hotel2Id.toString(),
              availableRooms: 0,
            }),
            expect.objectContaining({
              name: hotel3Name,
              id: hotel3Id.toString(),
              availableRooms: 9,
            }),
          ]),
        );
      });
    });
  });
});
