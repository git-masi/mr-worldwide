import fs from "fs";

// Configuration: define the files we want to parse
const versions = ["v1", "v2", "v3", "v4", "v5"];
const summaryData: {
  version: string;
  avg: string;
  med: string;
  p90: string;
  p95: string;
}[] = [];

versions.forEach((version) => {
  const filePath = `./temp/${version}_summary.json`;

  try {
    // Read and parse the k6 summary JSON file
    const rawData = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(rawData);

    // Locate our custom trend metric
    const metricName = `response_time`;
    const { values } = json.metrics[metricName] as {
      values: {
        avg: number;
        min: number;
        med: number;
        max: number;
        "p(90)": number;
        "p(95)": number;
      };
    };

    summaryData.push({
      version: version,
      avg: values.avg.toFixed(2),
      med: values.med.toFixed(2),
      p90: values["p(90)"].toFixed(2),
      p95: values["p(95)"].toFixed(2),
    });
  } catch (err: unknown) {
    console.error(
      `❌ Could not read ${filePath}:`,
      // @ts-ignores
      err?.message ?? "unknown error",
    );
  }
});

if (summaryData.length === 0) {
  console.error("No valid metric data found. Exiting.");
  process.exit(1);
}

// Generate the Markdown content
const markdownContent = `
# Endpoint Performance Comparison Report

This report compares the database report generation performance across different versions of the endpoint under an identical 20 VU (Virtual User) load.

| Endpoint Version | Average Latency | Median (p50) | 90th Percentile (p90) | 95th Percentile (p95) |
| :--- | :--- | :--- | :--- | :--- |
${summaryData.map((row) => `| **${row.version}** | ${row.avg} ms | ${row.med} ms | ${row.p90} ms | ${row.p95} ms |`).join("\n")}

---
*Generated automatically from k6 test results on ${new Date().toLocaleDateString()}.*
`;

// Save the Markdown report to disk
const outputPath = "./temp/performance_report_2.md";
fs.writeFileSync(outputPath, markdownContent, "utf8");

console.log(`\n✅ Markdown report successfully generated at: ${outputPath}\n`);
