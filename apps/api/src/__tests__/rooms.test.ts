import { expect, test } from "vitest";
import { roomsNeeded } from "../rooms";

test("return 0 if no bookings", () => {
  const result = roomsNeeded([]);

  expect(result).toBe(0);
});

test("return 1 if one booking", () => {
  const result = roomsNeeded([
    { checkIn: new Date("2026-01-01"), checkOut: new Date("2026-01-02") },
  ]);

  expect(result).toBe(1);
});

test("return 1 if bookings do not overlap", () => {
  const result = roomsNeeded([
    { checkIn: new Date("2026-01-01"), checkOut: new Date("2026-01-02") },
    { checkIn: new Date("2026-02-01"), checkOut: new Date("2026-02-02") },
    { checkIn: new Date("2026-03-01"), checkOut: new Date("2026-03-02") },
  ]);

  expect(result).toBe(1);
});

test("bookings do not need to be in any particular order", () => {
  const result = roomsNeeded([
    { checkIn: new Date("2026-02-01"), checkOut: new Date("2026-02-02") },
    { checkIn: new Date("2026-01-01"), checkOut: new Date("2026-01-02") },
    { checkIn: new Date("2026-03-01"), checkOut: new Date("2026-03-02") },
  ]);

  expect(result).toBe(1);
});

test("overlapping bookings require multiple rooms", () => {
  const result = roomsNeeded([
    { checkIn: new Date("2026-01-01"), checkOut: new Date("2026-01-05") },
    { checkIn: new Date("2026-01-03"), checkOut: new Date("2026-01-07") },
  ]);

  expect(result).toBe(2);
});
