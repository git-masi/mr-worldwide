import { PrismaClient } from "../prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import express from "express";
import morgan from "morgan";
import cors from "cors";

export function initServer(dsn: string) {
  const pool = new PrismaPg({ connectionString: dsn });
  const prisma = new PrismaClient({ adapter: pool });

  const app = express();

  app
    .disable("x-powered-by")
    .use(morgan("dev"))
    .use(express.json())
    .use(cors());

  app.get("/users", async (req, res) => {
    const users = await prisma.user.findMany();
    res.json(users.map((u) => ({ ...u, id: u.id.toString() })));
  });

  return app;
}
