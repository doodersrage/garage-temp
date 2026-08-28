#!/usr/bin/env python3
"""Minimal ThermalTrace ingest SDK."""
import json
import os
import sys
import urllib.request

base = (sys.argv[1] if len(sys.argv) > 1 else None) or os.environ.get("THERMALTRACE_URL", "https://thermaltrace.dev")
key = (sys.argv[2] if len(sys.argv) > 2 else None) or os.environ.get("THERMALTRACE_INGEST_KEY")
temp = float((sys.argv[3] if len(sys.argv) > 3 else None) or os.environ.get("TEMP", "42"))

if not key:
    print("Usage: ingest.py [baseUrl] <deviceKey> [tempF]", file=sys.stderr)
    sys.exit(1)

url = f"{base.rstrip('/')}/api/ingest/{key}"
req = urllib.request.Request(
    url,
    data=json.dumps({"temp1": temp}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(req) as resp:
    print(resp.status, resp.read().decode())
