import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";

const [urlFile, modeFile] = process.argv.slice(2);
if (!urlFile || !modeFile) throw new Error("Expected URL and mode file paths");

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  if (request.method !== "POST" || pathname !== "/api/audit") {
    response.writeHead(404).end();
    return;
  }
  request.resume();

  const mode = readFileSync(modeFile, "utf8").trim();
  const report = {
    id: "Newtonsoft.Json",
    installedVersion: "13.0.3",
    enrichedVulnerabilities: mode === "vulnerability"
      ? [{ id: "TEST-1", severity: "high" }]
      : [],
    ...(mode === "license" ? { license: "GPL-3.0-only" } : {}),
  };
  if (!["clean", "vulnerability", "license", "missing"].includes(mode)) {
    response.writeHead(500).end();
    return;
  }
  const payload = {
    reports: [report],
    packageCount: 1,
    vulnerabilityCount: report.enrichedVulnerabilities.length,
    criticalCount: 0,
    highCount: report.enrichedVulnerabilities.length,
    moderateCount: 0,
    lowCount: 0,
    typosquatWarnings: [],
    licenseIssues: [],
    grade: mode === "vulnerability" ? "C" : "A",
    score: mode === "vulnerability" ? 70 : 100,
  };
  response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(payload));
});

server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fixture server did not bind");
  writeFileSync(urlFile, `http://127.0.0.1:${address.port}\n`);
});
