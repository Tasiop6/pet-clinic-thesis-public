#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import path from "node:path";

const baseUrl = (process.env.TARGET_URL || "https://thesis-tasiopoulos.com").replace(/\/$/, "");
const username = process.env.TEST_USERNAME;
const password = process.env.TEST_PASSWORD;
const concurrency = Number(process.env.CONCURRENCY || 1);
const durationSeconds = Number(process.env.DURATION_SECONDS || 60);
const warmupRequests = Number(process.env.WARMUP_REQUESTS || 5);
const outputDirectory = process.env.RESULTS_DIR || "output/performance";

if (!username || !password) {
  console.error("Set TEST_USERNAME and TEST_PASSWORD in the current shell. Credentials are never written to results.");
  process.exit(2);
}
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 100) {
  throw new Error("CONCURRENCY must be an integer between 1 and 100.");
}
if (!Number.isFinite(durationSeconds) || durationSeconds < 10 || durationSeconds > 3600) {
  throw new Error("DURATION_SECONDS must be between 10 and 3600.");
}

const scenarios = [
  { name: "home", method: "GET", route: "/", authenticated: false },
  { name: "dashboard", method: "GET", route: "/api/dashboard", authenticated: true },
  { name: "owners", method: "GET", route: "/api/owners", authenticated: true },
  { name: "appointments", method: "GET", route: "/api/appointments", authenticated: true },
];

function percentile(values, percentage) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * percentage;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function round(value) {
  return value == null ? null : Number(value.toFixed(2));
}

async function timedFetch(route, options = {}) {
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${route}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
      ...options,
    });
    await response.arrayBuffer();
    return {
      status: response.status,
      ok: response.status >= 200 && response.status < 400,
      milliseconds: performance.now() - started,
      response,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      milliseconds: performance.now() - started,
      error: error instanceof Error ? error.name : "RequestError",
    };
  }
}

async function login() {
  const result = await timedFetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!result.ok) {
    throw new Error(`Login failed with HTTP ${result.status}; the test was not started.`);
  }
  const setCookies = result.response.headers.getSetCookie?.() || [];
  const cookie = setCookies.map((value) => value.split(";", 1)[0]).join("; ");
  if (!cookie) throw new Error("Login succeeded but no authentication cookie was returned.");
  return { cookie, loginMilliseconds: result.milliseconds };
}

async function runWorker(workerId, deadline, measurements) {
  const { cookie, loginMilliseconds } = await login();
  measurements.push({
    workerId,
    scenario: "login-setup",
    status: 200,
    ok: true,
    milliseconds: loginMilliseconds,
  });

  let cursor = workerId % scenarios.length;
  while (performance.now() < deadline) {
    const scenario = scenarios[cursor % scenarios.length];
    cursor += 1;
    const result = await timedFetch(scenario.route, {
      method: scenario.method,
      headers: scenario.authenticated ? { cookie } : {},
    });
    measurements.push({
      workerId,
      scenario: scenario.name,
      status: result.status,
      ok: result.ok,
      milliseconds: result.milliseconds,
      error: result.error,
    });
  }
}

async function warmUp() {
  const { cookie } = await login();
  for (let index = 0; index < warmupRequests; index += 1) {
    const scenario = scenarios[index % scenarios.length];
    await timedFetch(scenario.route, {
      method: scenario.method,
      headers: scenario.authenticated ? { cookie } : {},
    });
  }
}

function summarise(measurements, elapsedSeconds) {
  const names = [...new Set(measurements.map((item) => item.scenario))];
  const perScenario = Object.fromEntries(names.map((name) => {
    const rows = measurements.filter((item) => item.scenario === name);
    const timings = rows.map((item) => item.milliseconds);
    const failures = rows.filter((item) => !item.ok);
    return [name, {
      requests: rows.length,
      successes: rows.length - failures.length,
      errors: failures.length,
      errorRatePercent: round((failures.length / rows.length) * 100),
      p50Ms: round(percentile(timings, 0.50)),
      p95Ms: round(percentile(timings, 0.95)),
      p99Ms: round(percentile(timings, 0.99)),
      minMs: round(Math.min(...timings)),
      maxMs: round(Math.max(...timings)),
    }];
  }));
  const totalErrors = measurements.filter((item) => !item.ok).length;
  return {
    requests: measurements.length,
    successes: measurements.length - totalErrors,
    errors: totalErrors,
    errorRatePercent: round((totalErrors / measurements.length) * 100),
    throughputRequestsPerSecond: round(measurements.length / elapsedSeconds),
    perScenario,
  };
}

await warmUp();
const startedAt = new Date();
const startMonotonic = performance.now();
const deadline = startMonotonic + durationSeconds * 1000;
const measurements = [];
await Promise.all(Array.from({ length: concurrency }, (_, index) =>
  runWorker(index + 1, deadline, measurements)));
const finishedAt = new Date();
const elapsedSeconds = (performance.now() - startMonotonic) / 1000;

const report = {
  schemaVersion: 1,
  target: baseUrl,
  startedAtUtc: startedAt.toISOString(),
  finishedAtUtc: finishedAt.toISOString(),
  elapsedSeconds: round(elapsedSeconds),
  concurrency,
  configuredDurationSeconds: durationSeconds,
  warmupRequests,
  scenarios: scenarios.map(({ name, method, route, authenticated }) => ({ name, method, route, authenticated })),
  summary: summarise(measurements, elapsedSeconds),
};

await mkdir(outputDirectory, { recursive: true });
const stamp = startedAt.toISOString().replace(/[:.]/g, "-");
const outputPath = path.join(outputDirectory, `http-evaluation-vu${concurrency}-${stamp}.json`);
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(JSON.stringify(report.summary, null, 2));
console.log(`Result written to ${outputPath}`);
if (report.summary.errors > 0) process.exitCode = 1;
