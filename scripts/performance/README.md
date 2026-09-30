# Chapter 6 HTTP evaluation

This runner measures the deployed HTTPS application without writing clinical
or appointment data. It authenticates once per virtual user, then cycles
through the public home page and authenticated dashboard, owner-list and
appointment-list endpoints. Raw credentials are read only from the current
process environment and are never included in the JSON result.

Use a dedicated active staff test account against a frozen application build.
In PowerShell:

```powershell
$env:TARGET_URL = 'https://thesis-tasiopoulos.com'
$env:TEST_USERNAME = '<test username>'
$env:TEST_PASSWORD = '<enter locally; do not commit>'
$env:CONCURRENCY = '1'
$env:DURATION_SECONDS = '60'
node scripts/performance/run-http-evaluation.mjs
```

Repeat with concurrency `5`, `10`, and `25` only after the one-user baseline
succeeds. Keep each JSON file in `output/performance`; it contains UTC bounds,
request counts, throughput, errors, and p50/p95/p99 latency per scenario. Use
those UTC bounds to select the matching EC2 CPU, network, and status-check
window in CloudWatch.

For the first one-user run, the PowerShell wrapper avoids placing the password
in shell history and clears it from the child-process environment afterwards:

```powershell
.\scripts\performance\run-baseline-private.ps1
```
