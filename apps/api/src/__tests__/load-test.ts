import http from "k6/http";
import { Trend } from "k6/metrics";
import { sleep } from "k6";

const VERSION = __ENV.VERSION || "v1";

const responseTrend = new Trend(`response_time`, true);

export const options = {
  stages: [
    { duration: "10s", target: 20 }, // Ramp up
    { duration: "30s", target: 20 }, // Steady state
    { duration: "5s", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = "http://localhost:1337";
const checkIn = "2026-12-02";
const checkOut = "2026-12-07";

export default function () {
  const res = http.get(
    `${BASE_URL}/${VERSION}/availability?checkIn=${checkIn}&checkOut=${checkOut}`,
  );

  responseTrend.add(res.timings.duration);

  sleep(0.1);
}

export function handleSummary(data: unknown) {
  return {
    [`./temp/${VERSION}_summary.json`]: JSON.stringify(data),
  };
}
