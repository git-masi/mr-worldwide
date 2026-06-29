import http from "k6/http";
import { Trend } from "k6/metrics";
import { sleep } from "k6";
import prisma from "../client";

const config = {
  executor: "ramping-vus",
  exec: "main",
  stages: [
    { duration: "10s", target: 20 }, // Ramp up to 20 concurrent users over 10s
    { duration: "30s", target: 20 }, // Stay at 20 users for 30s to collect steady data
    { duration: "5s", target: 0 }, // Ramp down to 0 users
  ],
  gracefulRampDown: "5s",
  thresholds: {
    // Optional: Ensure failed requests stay low
    http_req_failed: ["rate<0.01"],
  },
};

// 2. Configure the load test shaping
export const options = {
  scenarios: {
    v1: config,
    v2: config,
    v3: config,
    v4: config,
  },
};

const BASE_URL = "http://localhost:1337";

const durations = [
  new Trend("waiting_time_v1", true),
  new Trend("waiting_time_v2", true),
  new Trend("waiting_time_v3", true),
  new Trend("waiting_time_v4", true),
];

const paths = [
  "/v1/availability",
  "/v2/availability",
  "/v3/availability",
  "/v4/availability",
];

let count = -1;

export function main() {
  count++;

  const path = paths[count];
  const duration = durations[count];

  const res = http.get(`${BASE_URL}${path}`);

  duration.add(res.timings.duration);

  // Pacing: wait 100ms between iterations per VU to avoid overwhelming a local setup instantly
  sleep(0.1);

  if (count === paths.length) {
    prisma
      .$executeRawUnsafe(
        `TRUNCATE TABLE "hotels", "guests", "bookings" CASCADE;`,
      )
      .then(() => {
        console.log("truncated tables");
      });
  }
}
