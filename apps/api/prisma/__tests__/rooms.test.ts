import { describe, test, expect } from "vitest";
import { Rooms } from "../utils";
import { range } from "@repo/numbers/range";
import { Temporal } from "temporal-polyfill";

describe("Rooms", () => {
  test("throw if total rooms < 1", () => {
    const testCases = [0, -1];

    testCases.forEach((numRooms) => {
      expect(() => new Rooms(numRooms)).toThrow("Must have 1 or more rooms");
    });
  });

  test("return available rooms", () => {
    const testCases = [
      { totalRooms: 10, occupy: 0, expected: 10 },
      { totalRooms: 10, occupy: 1, expected: 9 },
      { totalRooms: 10, occupy: 2, expected: 8 },
      { totalRooms: 10, occupy: 3, expected: 7 },
      { totalRooms: 10, occupy: 10, expected: 0 },
      { totalRooms: 10, occupy: 11, expected: 0 },
      { totalRooms: 10, occupy: 9999, expected: 0 },
    ];

    const now = Temporal.Now.plainDateISO();

    testCases.forEach(({ totalRooms, occupy, expected }) => {
      const rooms = new Rooms(totalRooms);

      for (const _ of range(occupy)) {
        rooms.occupy(now);
      }

      expect(rooms.getNumAvailable()).toEqual(expected);
    });
  });

  test("do not vacate room", () => {
    const rooms = new Rooms(1);

    rooms.occupy(Temporal.PlainDate.from("2026-01-02"));

    expect(rooms.getNumAvailable()).toEqual(0);

    rooms.vacate(Temporal.PlainDate.from("2026-01-01"));

    expect(rooms.getNumAvailable()).toEqual(0);
  });

  test("vacate room", () => {
    const rooms = new Rooms(1);

    rooms.occupy(Temporal.PlainDate.from("2026-01-01"));

    expect(rooms.getNumAvailable()).toEqual(0);

    rooms.vacate(Temporal.PlainDate.from("2026-01-01"));

    expect(rooms.getNumAvailable()).toEqual(1);
  });

  test("vacate all rooms", () => {
    const rooms = new Rooms(3);

    rooms.occupy(Temporal.PlainDate.from("2026-01-01"));
    rooms.occupy(Temporal.PlainDate.from("2026-01-02"));
    rooms.occupy(Temporal.PlainDate.from("2026-01-03"));

    expect(rooms.getNumAvailable()).toEqual(0);

    rooms.vacate(Temporal.PlainDate.from("2026-01-03"));

    expect(rooms.getNumAvailable()).toEqual(3);
  });

  test("vacate some rooms", () => {
    const rooms = new Rooms(3);

    rooms.occupy(Temporal.PlainDate.from("2026-01-01"));
    rooms.occupy(Temporal.PlainDate.from("2026-01-02"));
    rooms.occupy(Temporal.PlainDate.from("2026-01-03"));

    expect(rooms.getNumAvailable()).toEqual(0);

    rooms.vacate(Temporal.PlainDate.from("2026-01-02"));

    expect(rooms.getNumAvailable()).toEqual(2);
  });
});
