# Rorix Security Scan

The official GitHub Action for the Rorix supply-chain CLI. It installs the pinned public `Rorix.Cli` release, scans .NET or Node.js dependency manifests, generates SBOMs, and enforces `.rorix.yml` policy.

## Keyless (repositories connected through the Rorix GitHub App)

No secret is needed. The job exchanges its GitHub OIDC token for a short-lived, scan-only Rorix credential, and the policy gate applies the project's active license exceptions.

```yaml
jobs:
  rorix:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: rorix-io/rorix-scan-action@v1
        with:
          command: scan
          path: .
```

## With an API key

```yaml
- uses: rorix-io/rorix-scan-action@v1
  with:
    api-key: ${{ secrets.RORIX_API_KEY }}
    command: scan
    path: .
```

Pass `project-id` to apply that project's license exceptions when using an API key.

See the [Rorix GitHub Actions guide](https://rorix.io/docs/integrations/github-actions) for inputs, SARIF upload, policy, and SBOM examples.

The default CLI version is `0.1.7`. Scan runs return a failing job status for blocking vulnerability or license-policy findings, and for missing manifests.

Set `fail-on-vulnerabilities: 'false'` for advisory scans. Vulnerabilities remain in the scan output while missing manifests and scan errors still fail the job. The default remains `true` for existing workflows.

`base-url` defaults to the `RORIX_BASE_URL` environment variable, then `https://rorix.io`.

`v1` is the supported moving major tag. Pin a full commit SHA when your repository policy requires immutable third-party Actions.
