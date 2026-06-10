import { describe, test, expect } from "vitest";
import { getCreatedAtDate } from "../utils";
import { Temporal } from "temporal-polyfill";

describe("getCreatedAtDate", () => {
  test("get an increasing series of dates", () => {
    const start = Temporal.PlainDate.from("2026-01-01");
    const futureDate = Temporal.PlainDate.from("2026-03-01");

    const getDate = getCreatedAtDate(start);

    const dates = Array.from({ length: 1000 }).map(() => getDate(futureDate));

    console.log(dates.map((d) => d.toString()));

    dates.forEach((date, i) => {
      // Every date must be before the future date
      expect(Temporal.PlainDate.compare(date, futureDate)).toEqual(-1);

      if (i < 1) {
        return;
      }

      // Every date must be on or after the date before it
      expect(Temporal.PlainDate.compare(date, dates[i]!)).greaterThanOrEqual(0);
    });
  });
});
