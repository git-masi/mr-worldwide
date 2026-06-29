import http from "k6/http";
import { Trend } from "k6/metrics";
import { sleep } from "k6";
import exec from "k6/execution";

const config = {
  executor: "ramping-vus",
  exec: "main",
  stages: [
    { duration: "10s", target: 20 }, // Ramp up to 20 concurrent users over 10s
    { duration: "30s", target: 20 }, // Stay at 20 users for 30s to collect steady data
    { duration: "5s", target: 0 }, // Ramp down to 0 users
  ],
  gracefulRampDown: "5s",
};

// 2. Configure the load test shaping
export const options = {
  scenarios: {
    0: config,
    1: config,
    2: config,
    3: config,
  },
  thresholds: {
    // Optional: Ensure failed requests stay low
    http_req_failed: ["rate<0.01"],
  },
};

const baseUrl = "http://localhost:1337";

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

export function main() {
  const test = +exec.scenario.name;
  if (!Number.isInteger(test) || test > paths.length) {
    exec.test.abort(`invalid test: ${test}`);
  }

  const path = paths[test];
  const duration = durations[test];

  if (!path || !duration) {
    exec.test.abort(
      `Missing path or duration | typeof path: ${typeof path}, typeof duration: ${typeof duration}`,
    );
  }

  const res = http.get(`${baseUrl}${path}`);

  duration.add(res.timings.duration);

  // Pacing: wait 100ms between iterations per VU to avoid overwhelming a local setup instantly
  sleep(0.1);
}
