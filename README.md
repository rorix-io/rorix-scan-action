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

`v1` is the supported moving major tag. Pin a full commit SHA when your repository policy requires immutable third-party Actions.
