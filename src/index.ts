import * as core from "@actions/core";
import * as github from "@actions/github";
import { findAllPackages } from "./find-packages";
import { getDiffPackages } from "./diff-packages";
import { auditPackages } from "./audit";
import { formatResults } from "./format";

async function run() {
  try {
    const failOnSeverity = core.getInput("fail-on-severity") || "high";
    const failOnScore = parseInt(core.getInput("fail-on-score") || "0", 10);
    const licensePolicy = core.getInput("license-policy") || "none";
    const diffOnly = core.getInput("diff-only") !== "false";
    const rorixUrl = core.getInput("rorix-url") || "https://rorix.io";

    const workDir = process.env.GITHUB_WORKSPACE || process.cwd();

    // Find packages
    core.info("Scanning for NuGet packages...");
    let packages;

    if (diffOnly && github.context.payload.pull_request) {
      const baseBranch = github.context.payload.pull_request.base.ref;
      core.info(`Diff mode: comparing against ${baseBranch}`);
      packages = getDiffPackages(workDir, baseBranch);
      core.info(`Found ${packages.length} changed package(s)`);
    } else {
      packages = findAllPackages(workDir);
      core.info(`Found ${packages.length} package(s)`);
    }

    if (packages.length === 0) {
      core.info("No packages to scan.");
      core.summary.addHeading("Rorix Security Scan", 2);
      core.summary.addRaw("No NuGet packages found to scan.");
      await core.summary.write();
      return;
    }

    // Audit
    core.info(`Auditing ${packages.length} package(s) via ${rorixUrl}...`);
    const audit = await auditPackages(packages, rorixUrl);

    // Format results
    const result = formatResults(audit, { failOnSeverity, failOnScore, licensePolicy });

    // Write job summary
    core.summary.addHeading("Rorix Security Scan", 2);
    core.summary.addRaw(`\n${result.summary}\n\n`);

    if (result.errors.length > 0) {
      core.summary.addHeading("Errors", 3);
      core.summary.addTable([
        [{ data: "Package", header: true }, { data: "Issue", header: true }],
        ...result.errors.map((e) => {
          const [pkg, ...rest] = e.split(" — ");
          return [pkg, rest.join(" — ")];
        }),
      ]);
    }

    if (result.warnings.length > 0) {
      core.summary.addHeading("Warnings", 3);
      core.summary.addTable([
        [{ data: "Package", header: true }, { data: "Issue", header: true }],
        ...result.warnings.map((w) => {
          const [pkg, ...rest] = w.split(" — ");
          return [pkg, rest.join(" — ")];
        }),
      ]);
    }

    await core.summary.write();

    // Set outputs
    core.setOutput("packages-scanned", packages.length);
    core.setOutput("vulnerabilities-found", audit.totalVulns);
    core.setOutput("errors", result.errors.length);
    core.setOutput("warnings", result.warnings.length);

    if (result.shouldFail) {
      core.setFailed(`Security scan failed: ${result.errors.length} error(s) found`);
    } else {
      core.info(`Scan complete: ${result.summary}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unexpected error occurred");
    }
  }
}

run();
