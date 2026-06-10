import { describe, test, expect } from "vitest";
import { Rooms } from "../utils";

describe("Rooms", () => {
  test("throw if total rooms < 1", () => {
    const testCases = [0, -1];

    testCases.forEach((numRooms) => {
      expect(() => new Rooms(numRooms)).toThrow("Must have 1 or more rooms");
    });
  });
});
