import * as core from "@actions/core";
import { AuditResponse, PackageAuditResult } from "./audit";

const SEVERITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  moderate: 2,
  low: 1,
  none: 0,
};

export interface FormatOptions {
  failOnSeverity: string;
  failOnScore: number;
  licensePolicy: string;
}

export interface FormatResult {
  shouldFail: boolean;
  summary: string;
  errors: string[];
  warnings: string[];
}

function isCopyleft(license: string | null): boolean {
  if (!license) return false;
  const copyleft = ["GPL", "AGPL", "LGPL", "MPL", "EUPL", "CPAL", "OSL", "SSPL"];
  const upper = license.toUpperCase();
  return copyleft.some((l) => upper.includes(l));
}

export function formatResults(audit: AuditResponse, options: FormatOptions): FormatResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let shouldFail = false;

  const severityThreshold = SEVERITY_ORDER[options.failOnSeverity] ?? 3;

  for (const pkg of audit.packages) {
    // Check vulnerabilities
    for (const vuln of pkg.vulnerabilities) {
      const vulnSeverity = SEVERITY_ORDER[vuln.severity.toLowerCase()] ?? 0;
      const line = `${pkg.id}@${pkg.version} — ${vuln.id} (${vuln.severity}): ${vuln.description}`;

      if (vulnSeverity >= severityThreshold) {
        errors.push(line);
        shouldFail = true;
        core.error(line, { title: `CVE: ${vuln.id}`, file: pkg.file });
      } else {
        warnings.push(line);
        core.warning(line, { title: `CVE: ${vuln.id}`, file: pkg.file });
      }
    }

    // Check score
    if (options.failOnScore > 0 && pkg.score < options.failOnScore) {
      const line = `${pkg.id}@${pkg.version} — Score ${pkg.score}/100 (below threshold ${options.failOnScore})`;
      warnings.push(line);
      core.warning(line, { file: pkg.file });
    }

    // Check license
    if (options.licensePolicy !== "none") {
      if (options.licensePolicy === "restrictive" && isCopyleft(pkg.license)) {
        const line = `${pkg.id}@${pkg.version} — Copyleft license: ${pkg.license}`;
        errors.push(line);
        shouldFail = true;
        core.error(line, { title: "License violation", file: pkg.file });
      } else if (options.licensePolicy === "permissive" && !pkg.license) {
        const line = `${pkg.id}@${pkg.version} — Unknown license`;
        warnings.push(line);
        core.warning(line, { file: pkg.file });
      }
    }
  }

  // Build summary
  const parts = [`${audit.packages.length} packages scanned`];
  if (warnings.length > 0) parts.push(`${warnings.length} warning(s)`);
  if (errors.length > 0) parts.push(`${errors.length} error(s)`);
  if (errors.length === 0 && warnings.length === 0) parts.push("no issues found");

  const summary = parts.join(" | ");

  return { shouldFail, summary, errors, warnings };
}
