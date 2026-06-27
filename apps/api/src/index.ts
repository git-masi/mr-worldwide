import { initServer } from "./server";

const server = initServer();

const port = process.env.PORT ?? 1337;

server.listen(port, () =>
  console.log(`
🚀 Server ready at: http://localhost:${port}
`),
);
