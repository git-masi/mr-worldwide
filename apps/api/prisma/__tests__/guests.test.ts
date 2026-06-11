import { describe, test, expect } from "vitest";
import { getRandomGuest } from "../utils";

describe("getRandomGuest", () => {
  test("return all guests", () => {
    const guests = [{ id: BigInt(1) }, { id: BigInt(2) }];
    const getNextGuest = getRandomGuest(guests);

    const result = [getNextGuest(), getNextGuest()];

    expect(result).toMatchObject(expect.arrayContaining(guests));
  });

  test("repeat guest after all have been seen", () => {
    const guests = [{ id: BigInt(1) }, { id: BigInt(2) }];
    const getNextGuest = getRandomGuest(guests);

    const result = [
      getNextGuest(),
      getNextGuest(),
      getNextGuest(),
      getNextGuest(),
    ];

    const set = new Set(result);

    // There should only be two unique objcts
    expect(set.size).toBe(2);
  });
});
