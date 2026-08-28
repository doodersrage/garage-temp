#!/usr/bin/env node
/** Minimal ThermalTrace ingest SDK — Node 18+ */
const baseUrl = process.argv[2] || process.env.THERMALTRACE_URL || "https://thermaltrace.dev";
const deviceKey = process.argv[3] || process.env.THERMALTRACE_INGEST_KEY;
const temp = Number(process.argv[4] ?? process.env.TEMP ?? "42");

if (!deviceKey) {
  console.error("Usage: node ingest.mjs [baseUrl] <deviceKey> [tempF]");
  process.exit(1);
}

const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/ingest/${deviceKey}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ temp1: temp }),
});

console.log(res.status, await res.text());
