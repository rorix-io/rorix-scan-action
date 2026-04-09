# Rorix Scan Action

A GitHub Action that scans NuGet dependencies for vulnerabilities, license issues, and security risks. Powered by [Rorix](https://rorix.io).

## Quick Start

1. Get an API key from your [Rorix dashboard](https://rorix.io/dashboard/settings) (Settings > API Keys)
2. Add it as a repository secret named `RORIX_API_KEY`
3. Create the workflow:

```yaml
# .github/workflows/rorix.yml
name: Rorix Security Scan
on: [pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: rorix-io/rorix-scan-action@v1
        with:
          api-key: ${{ secrets.RORIX_API_KEY }}
```

That's it. The action will scan all NuGet packages in your repository and fail the check if any high or critical CVEs are found.

## Configuration

```yaml
- uses: rorix-io/rorix-scan-action@v1
  with:
    # Required: your Rorix API key
    api-key: ${{ secrets.RORIX_API_KEY }}

    # Minimum CVE severity to fail the check
    # Options: critical, high, moderate, low, none
    # Default: high
    fail-on-severity: high

    # Fail if any package security score is below this threshold (0-100)
    # Default: 0 (disabled)
    fail-on-score: 40

    # License policy enforcement
    # Options: restrictive (block copyleft), permissive (block unknown), none
    # Default: none
    license-policy: restrictive

    # Only scan packages that changed in this PR
    # Default: true
    diff-only: true
```

## What It Scans

The action finds all NuGet package references in your repository:

- `*.csproj` files (`<PackageReference>` elements)
- `Directory.Packages.props` (centralized package management)
- `packages.config` (legacy format)

## What It Checks

| Check | Default | Description |
|-------|---------|-------------|
| **CVE vulnerabilities** | Fail on high+ | Known security vulnerabilities from NVD, GitHub Advisories, OSV |
| **Security score** | Disabled | Composite score based on CVEs, maintenance, author reputation |
| **License compliance** | Disabled | Copyleft license detection (GPL, AGPL, LGPL, etc.) |
| **Deprecated packages** | Warn | Packages marked as deprecated on nuget.org |

## Diff Mode

By default, the action only scans packages that **changed** in the pull request. This keeps scan times fast and avoids alert fatigue from existing dependencies.

Set `diff-only: false` to scan all packages (useful for scheduled full scans):

```yaml
# Full scan on schedule
on:
  schedule:
    - cron: '0 6 * * 1'  # Every Monday at 6am

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: rorix-io/rorix-scan-action@v1
        with:
          api-key: ${{ secrets.RORIX_API_KEY }}
          diff-only: false
```

## Outputs

| Output | Description |
|--------|-------------|
| `packages-scanned` | Number of packages scanned |
| `vulnerabilities-found` | Total number of CVEs found |
| `errors` | Number of errors (check failures) |
| `warnings` | Number of warnings |

```yaml
- uses: rorix-io/rorix-scan-action@v1
  id: scan
- run: echo "Found ${{ steps.scan.outputs.vulnerabilities-found }} vulnerabilities"
```

## Job Summary

The action writes a detailed summary to the GitHub Actions job summary, including a table of all findings with severity, CVE IDs, and affected packages.

## Authentication

This action requires a Rorix API key. Create one in your [Rorix dashboard](https://rorix.io/dashboard/settings) under Settings > API Keys, then add it as a GitHub repository secret.

## License

MIT
