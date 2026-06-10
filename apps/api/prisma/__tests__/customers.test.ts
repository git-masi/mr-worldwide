import { describe, test, expect } from "vitest";
import { getRandomCustomer } from "../utils";

describe("getRandomCustomer", () => {
  test("return all customers", () => {
    const customers = [{ id: BigInt(1) }, { id: BigInt(2) }];
    const getNextCustomer = getRandomCustomer(customers);

    const result = [getNextCustomer(), getNextCustomer()];

    expect(result).toMatchObject(expect.arrayContaining(customers));
  });

  test("repeat customer after all have been seen", () => {
    const customers = [{ id: BigInt(1) }, { id: BigInt(2) }];
    const getNextCustomer = getRandomCustomer(customers);

    const result = [
      getNextCustomer(),
      getNextCustomer(),
      getNextCustomer(),
      getNextCustomer(),
    ];

    const set = new Set(result);

    // There should only be two unique objcts
    expect(set.size).toBe(2);
  });
});
