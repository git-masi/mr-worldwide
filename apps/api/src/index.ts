import dotenv from "dotenv";
import { initServer } from "./server";

dotenv.config();

const dsn = process.env.DATABASE_URL;
if (!dsn) {
  throw new Error("Missing env var DATABASE_URL");
}

// This allows `BigInt` values to be serialized using `JSON.stringify`.
// There are alternative ways to achieve the same results, but this is the easiest for our use case.
// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const server = initServer(dsn);

const port = process.env.PORT ?? 1337;

server.listen(port, () =>
  console.log(`
🚀 Server ready at: http://localhost:${port}
`),
);
