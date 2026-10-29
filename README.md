# Rorix Security Scan

The official GitHub Action for the Rorix supply-chain CLI. It installs the pinned public `Rorix.Cli` release, scans .NET or Node.js dependency manifests, generates SBOMs, and enforces `.rorix.yml` policy.

```yaml
- uses: rorix-io/rorix-scan-action@v1
  with:
    api-key: ${{ secrets.RORIX_API_KEY }}
    command: scan
    path: .
```

See the [Rorix GitHub Actions guide](https://rorix.io/docs/integrations/github-actions) for inputs, SARIF upload, policy, and SBOM examples.

The default CLI version is `0.1.4`. Scan runs return a failing job status for blocking vulnerability or license-policy findings, and for missing manifests.

Set `fail-on-vulnerabilities: 'false'` for advisory scans. Vulnerabilities remain in the scan output while missing manifests and scan errors still fail the job. The default remains `true` for existing workflows.

`v1` is the supported moving major tag. Pin a full commit SHA when your repository policy requires immutable third-party Actions.
