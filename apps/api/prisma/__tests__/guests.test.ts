import { describe, test, expect } from "vitest";
import { getNextGuestId, HighValueGuests } from "../utils";
import { Temporal } from "temporal-polyfill";

describe("getNextGuestId", () => {
  test("return IDs in ascending order from 1", () => {
    const currentDate = Temporal.Now.plainDateISO().toString();
    const nextId = getNextGuestId({
      totalGuests: 3,
      isHighValueGuest: () => false,
      useHighValueGuest: () => false,
    });

    expect([
      nextId(currentDate),
      nextId(currentDate),
      nextId(currentDate),
    ]).toMatchObject([1, 2, 3]);
  });

  test("loop back to start if all guest IDs have been used", () => {
    const currentDate = Temporal.Now.plainDateISO().toString();
    const nextId = getNextGuestId({
      totalGuests: 3,
      isHighValueGuest: () => false,
      useHighValueGuest: () => false,
    });

    expect([
      nextId(currentDate),
      nextId(currentDate),
      nextId(currentDate),
      nextId(currentDate),
      nextId(currentDate),
      nextId(currentDate),
    ]).toMatchObject([1, 2, 3, 1, 2, 3]);
  });

  test("always return high value guest", () => {
    const currentDate = Temporal.Now.plainDateISO();
    const nextId = getNextGuestId({
      totalGuests: 3,
      // First guest ID is added to pool
      isHighValueGuest: (() => {
        let count = 0;

        return () => {
          count++;
          return count === 1;
        };
      })(),
      // Subsequent requests return first guest ID
      useHighValueGuest: () => true,
    });

    expect([
      nextId(currentDate.toString()),
      nextId(currentDate.add({ days: 1 }).toString()),
      nextId(currentDate.add({ days: 2 }).toString()),
    ]).toMatchObject([1, 1, 1]);
  });

  test("every other guest is high value", () => {
    const currentDate = Temporal.Now.plainDateISO();
    const nextId = getNextGuestId({
      totalGuests: 10,
      // Only the first guest is high value
      isHighValueGuest: (() => {
        let first = true;

        return () => {
          if (first) {
            first = false;
            return true;
          }

          return false;
        };
      })(),
      // Every other call return the first guest ID
      useHighValueGuest: (() => {
        let count = 0;

        return (_: number) => {
          count++;

          return count % 2 === 0;
        };
      })(),
    });

    expect(
      Array.from({ length: 20 }).map((_, i) =>
        nextId(currentDate.add({ days: i }).toString()),
      ),
    ).toMatchObject([
      1, 1, 2, 1, 3, 1, 4, 1, 5, 1, 6, 1, 7, 1, 8, 1, 9, 1, 10, 1,
    ]);
  });

  test("do not reuse high value guest on same date", () => {
    const currentDate = Temporal.Now.plainDateISO().toString();
    const nextId = getNextGuestId({
      totalGuests: 10,
      // Only the first guest is high value
      isHighValueGuest: (() => {
        let first = true;

        return () => {
          if (first) {
            first = false;
            return true;
          }

          return false;
        };
      })(),
      // Even though this is always `true` we cannot reuse high value guests on a given day
      useHighValueGuest: () => true,
    });

    expect(
      Array.from({ length: 10 }).map(() => nextId(currentDate)),
    ).toMatchObject([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe("HighValueGuests", () => {
  test("return null if no high value guests added", () => {
    const checkIn1 = "2026-01-01";
    const checkIn2 = "2026-01-01";

    const hvg = new HighValueGuests();

    expect([
      hvg.next(checkIn1),
      hvg.next(checkIn1),
      hvg.next(checkIn1),
    ]).toMatchObject([null, null, null]);

    expect([
      hvg.next(checkIn2),
      hvg.next(checkIn2),
      hvg.next(checkIn2),
    ]).toMatchObject([null, null, null]);
  });

  test("return high value guest the day after it was added", () => {
    const checkIn1 = "2026-01-01";
    const checkIn2 = "2026-01-02";

    const hvg = new HighValueGuests();
    hvg.add(1, checkIn1);

    expect([hvg.next(checkIn1), hvg.next(checkIn2)]).toMatchObject([null, 1]);
  });

  test("return each high value guest only once for the given date", () => {
    const checkIn1 = "2026-01-01";
    const checkIn2 = "2026-01-02";

    const hvg = new HighValueGuests();
    hvg.add(1, checkIn1);
    hvg.add(2, checkIn1);
    hvg.add(3, checkIn1);

    expect([
      hvg.next(checkIn2),
      hvg.next(checkIn2),
      hvg.next(checkIn2),
      hvg.next(checkIn2),
      hvg.next(checkIn2),
      hvg.next(checkIn2),
    ]).toMatchObject(expect.arrayContaining([1, 2, 3, null, null, null]));
  });

  test("high value guests can be reused across dates", () => {
    const checkIn1 = "2026-01-01";
    const checkIn2 = "2026-01-02";

    const hvg = new HighValueGuests();
    hvg.add(1, checkIn1);

    expect([
      hvg.next(checkIn1),
      hvg.next(checkIn1),
      hvg.next(checkIn2),
      hvg.next(checkIn2),
    ]).toMatchObject(expect.arrayContaining([1, null, 1, null]));
  });

  test("high value guests cannot be used on date inserted", () => {
    const checkIn = "2026-01-01";

    const hvg = new HighValueGuests();

    hvg.add(1, checkIn);
    expect(hvg.next(checkIn)).toBe(null);

    hvg.add(2, checkIn);
    expect(hvg.next(checkIn)).toBe(null);

    hvg.add(3, checkIn);
    expect(hvg.next(checkIn)).toBe(null);
  });
});
