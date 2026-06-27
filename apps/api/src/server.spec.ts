import request from "supertest";
import { afterAll, beforeEach, describe, test } from "vitest";
import { initServer } from "./server";
import prisma from "./client";
import { faker } from "@faker-js/faker";

describe("server integration tests", () => {
  const server = initServer();

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "hotels", "guests", "bookings" CASCADE;`,
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("return status 200", () => {
    request(server)
      .get("/availability")
      .query({ checkIn: "2026-01-01", checkOut: "2026-01-02" })
      .expect(200);
  });

  test("return status 200", async () => {
    const { id: hotelId } = await prisma.hotel.create({
      data: {
        name: "test hotel",
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
        checkIn: "2021-01-01",
        checkOut: "2021-01-02",
      },
    });

    request(server)
      .get("/availability")
      .query({ checkIn: "2026-01-01", checkOut: "2026-01-02" })
      .expect(200);
  });
});
