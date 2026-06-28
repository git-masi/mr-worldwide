import request from "supertest";
import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { initServer } from "./server";
import prisma from "./client";
import { faker } from "@faker-js/faker";
import { Temporal } from "temporal-polyfill";

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

  test("return status 200", async () => {
    const res = await request(server)
      .get("/availability")
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
      .get("/availability")
      .query({ checkIn: checkIn, checkOut: checkOut });

    expect(res.status).toEqual(200);

    expect(res.body).toMatchObject([
      {
        name: hotelName,
        id: hotelId.toString(),
        availableRooms: 1,
      },
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
      .get("/availability")
      .query({ checkIn: checkIn, checkOut: checkOut });

    expect(res.status).toEqual(200);

    expect(res.body).toMatchObject([
      {
        name: hotelName,
        id: hotelId.toString(),
        availableRooms: 2,
      },
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
      .get("/availability")
      .query({ checkIn: checkIn, checkOut: checkOut });

    expect(res.status).toEqual(200);

    expect(res.body).toMatchObject([
      {
        name: hotelName,
        id: hotelId.toString(),
        availableRooms: 0,
      },
    ]);
  });
});
