import { describe, test, expect } from "vitest";
import { getNextGuestId } from "../utils";
import { Temporal } from "temporal-polyfill";

describe("getNextGuestId", () => {
  const currentDate = Temporal.Now.plainDateISO();

  test("return IDs in ascending order from 1", () => {
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

  test("throw error if no new IDs and no high value guests", () => {
    const nextId = getNextGuestId({
      totalGuests: 3,
      isHighValueGuest: () => false,
      useHighValueGuest: () => false,
    });

    nextId(currentDate);
    nextId(currentDate);
    nextId(currentDate);

    expect(() => nextId(currentDate)).toThrow(
      "Cannot generate new guest ID nor get high value guest ID",
    );
  });

  test("always return high value guest", () => {
    const nextId = getNextGuestId({
      totalGuests: 3,
      // First guest ID is added to pool
      isHighValueGuest: () => true,
      // Subsequent requests return first guest ID
      useHighValueGuest: (poolSize: number) => poolSize === 1,
    });

    expect([
      nextId(currentDate),
      nextId(currentDate.add({ days: 1 })),
      nextId(currentDate.add({ days: 2 })),
    ]).toMatchObject([1, 1, 1]);
  });

  test("every other guest is high value", () => {
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
        nextId(currentDate.add({ days: i })),
      ),
    ).toMatchObject([
      1, 1, 2, 1, 3, 1, 4, 1, 5, 1, 6, 1, 7, 1, 8, 1, 9, 1, 10, 1,
    ]);
  });

  test("do not reuse high value guest on same date", () => {
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
