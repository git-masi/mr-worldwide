import "dotenv/config";
import { initServer } from "./server";

const dsn = process.env.DATABASE_URL;
if (!dsn) {
  throw new Error("Missing env var DATABASE_URL");
}

const server = initServer(dsn);

const port = process.env.PORT ?? 1337;

server.listen(port, () =>
  console.log(`
🚀 Server ready at: http://localhost:${port}
`),
);
