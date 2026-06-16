import { describe, test, expect } from "vitest";
import { range, rangeForever } from "../range";

describe("range", () => {
  test("range from 0 to n", () => {
    expect([...range(5)]).toMatchObject([0, 1, 2, 3, 4]);
  });
});

describe("rangeForever", () => {
  test("range from 0 to n", () => {
    const iter = rangeForever(3);

    const result = [
      iter.next().value,
      iter.next().value,
      iter.next().value,
      // repeat
      iter.next().value,
      iter.next().value,
      iter.next().value,
      // repeat
      iter.next().value,
    ];

    expect(result).toMatchObject([0, 1, 2, 0, 1, 2, 0]);
  });
});
