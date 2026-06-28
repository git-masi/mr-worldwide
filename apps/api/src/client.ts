import { PrismaClient } from "../prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const dsn = process.env.DATABASE_URL;
if (!dsn) {
  throw new Error("Missing env var DATABASE_URL");
}

console.log(dsn);
if (dsn !== "postgresql://prisma:prisma@localhost:5433/tests") {
  throw new Error(`invalid DSN: '${dsn}'`);
}

// This allows `BigInt` values to be serialized using `JSON.stringify`.
// There are alternative ways to achieve the same results, but this is the easiest for our use case.
// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const pool = new PrismaPg({ connectionString: dsn });
const prisma = new PrismaClient({ adapter: pool });

export default prisma;
