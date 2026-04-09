import { PackageRef } from "./find-packages";

export interface VulnerabilityInfo {
  id: string;
  severity: string;
  description: string;
  fixedVersion: string | null;
}

export interface PackageAuditResult {
  id: string;
  version: string;
  file: string;
  score: number;
  grade: string;
  vulnerabilities: VulnerabilityInfo[];
  license: string | null;
  deprecated: boolean;
  lastPublished: string | null;
}

export interface AuditResponse {
  packages: PackageAuditResult[];
  totalVulns: number;
  averageScore: number;
}

/**
 * Build a minimal .csproj content from package references for the audit API.
 */
function buildCsprojContent(packages: PackageRef[]): string {
  const refs = packages
    .map((p) => `    <PackageReference Include="${p.id}" Version="${p.version}" />`)
    .join("\n");
  return `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
${refs}
  </ItemGroup>
</Project>`;
}

export async function auditPackages(
  packages: PackageRef[],
  rorixUrl: string,
  apiKey: string
): Promise<AuditResponse> {
  if (packages.length === 0) {
    return { packages: [], totalVulns: 0, averageScore: 100 };
  }

  const content = buildCsprojContent(packages);

  const res = await fetch(`${rorixUrl}/api/audit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      content,
      filename: "scan.csproj",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Rorix audit API returned ${res.status}: ${text}`);
  }

  const data = await res.json();
  const result = data.result || data;

  // Map audit response to our format
  const reports = result.reports || [];
  let totalVulns = 0;
  let totalScore = 0;

  const auditedPackages: PackageAuditResult[] = reports.map(
    (report: {
      id: string;
      installedVersion: string;
      enrichedVulnerabilities?: { id: string; severity: string; description: string; fixedVersion: string | null }[];
      license?: { id: string } | null;
      deprecated?: boolean;
      lastPublished?: string;
    }) => {
      const vulns = (report.enrichedVulnerabilities || []).map((v) => ({
        id: v.id,
        severity: v.severity,
        description: v.description,
        fixedVersion: v.fixedVersion,
      }));
      totalVulns += vulns.length;

      const pkg = packages.find((p) => p.id === report.id);
      return {
        id: report.id,
        version: report.installedVersion,
        file: pkg?.file || "",
        score: 0, // Score comes from the top-level result
        grade: "",
        vulnerabilities: vulns,
        license: report.license?.id || null,
        deprecated: report.deprecated || false,
        lastPublished: report.lastPublished || null,
      };
    }
  );

  totalScore = result.score ?? 100;

  return {
    packages: auditedPackages,
    totalVulns,
    averageScore: totalScore,
  };
}
