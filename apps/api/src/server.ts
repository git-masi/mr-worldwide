import express from "express";
import morgan from "morgan";
import cors from "cors";

export function initServer() {
  const app = express();

  app
    .disable("x-powered-by")
    .use(morgan("dev"))
    .use(express.json())
    .use(cors());

  app.get("/ping", async (req, res) => {
    res.type("text/plain").send("pong");
  });

  app.get("/availability", async (req, res) => {
    res.send();
  });

  return app;
}
