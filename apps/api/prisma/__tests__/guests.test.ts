import { describe, test, expect } from "vitest";
import { getNextGuestId } from "../utils";

describe("getNextGuestId", () => {
  test("return IDs in ascending order from 1", () => {
    const nextId = getNextGuestId({
      totalGuests: 3,
      isHighValueGuest: () => false,
      useHighValueGuest: () => false,
    });

    expect([nextId(), nextId(), nextId()]).toMatchObject([1, 2, 3]);
  });

  test("throw error if no new IDs and no high value guests", () => {
    const nextId = getNextGuestId({
      totalGuests: 3,
      isHighValueGuest: () => false,
      useHighValueGuest: () => false,
    });

    nextId();
    nextId();
    nextId();

    expect(() => nextId()).toThrow(
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

    expect([nextId(), nextId(), nextId()]).toMatchObject([1, 1, 1]);
  });

  test("every other guest is high value", () => {
    const nextId = getNextGuestId({
      totalGuests: 10,
      // Only the first guest is high value
      isHighValueGuest: (() => {
        let shouldUse = true;

        return () => {
          if (shouldUse) {
            shouldUse = false;
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

    expect(Array.from({ length: 20 }).map(nextId)).toMatchObject([
      1, 1, 2, 1, 3, 1, 4, 1, 5, 1, 6, 1, 7, 1, 8, 1, 9, 1, 10, 1,
    ]);
  });
});
