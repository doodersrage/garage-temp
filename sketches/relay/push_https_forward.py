#!/usr/bin/env python3
"""HTTP→HTTPS forwarder for Arduino Uno + Ethernet shield push ingest.

The W5100 stack cannot TLS. Run this on a LAN host (Pi, NAS, laptop), point the
sketch INGEST_HOST/PORT here, and it POSTs the same path+body to ThermalTrace.

  python3 push_https_forward.py --listen 0.0.0.0:8080 \\
    --upstream https://thermaltrace.dev

Then in ethernet_dht22_ingest.ino:
  #define INGEST_HOST "192.168.1.50"
  #define INGEST_PORT 8080
  #define INGEST_PATH "/api/ingest/YOUR_DEVICE_KEY"
"""

from __future__ import annotations

import argparse
import http.client
import http.server
import ssl
import urllib.parse
from typing import Tuple


def split_listen(value: str) -> Tuple[str, int]:
    host, _, port = value.rpartition(":")
    return (host or "0.0.0.0", int(port or "8080"))


class ForwardHandler(http.server.BaseHTTPRequestHandler):
    upstream: urllib.parse.ParseResult

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length) if length else b""
        parsed = self.upstream
        conn: http.client.HTTPConnection
        if parsed.scheme == "https":
            ctx = ssl.create_default_context()
            conn = http.client.HTTPSConnection(parsed.hostname, parsed.port or 443, context=ctx, timeout=20)
        else:
            conn = http.client.HTTPConnection(parsed.hostname, parsed.port or 80, timeout=20)
        path = self.path or parsed.path or "/"
        headers = {"Content-Type": self.headers.get("Content-Type", "application/json")}
        try:
            conn.request("POST", path, body=body, headers=headers)
            resp = conn.getresponse()
            payload = resp.read()
            self.send_response(resp.status)
            self.send_header("Content-Type", resp.getheader("Content-Type", "application/json"))
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        except OSError as exc:
            msg = f'{{"error":"relay_failed","detail":"{exc}"}}'.encode()
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)
        finally:
            conn.close()

    def log_message(self, fmt: str, *args: object) -> None:
        print("%s - %s" % (self.address_string(), fmt % args))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--listen", default="0.0.0.0:8080")
    parser.add_argument("--upstream", default="https://thermaltrace.dev")
    args = parser.parse_args()
    host, port = split_listen(args.listen)
    parsed = urllib.parse.urlparse(args.upstream)
    if not parsed.scheme or not parsed.hostname:
        raise SystemExit("upstream must be an absolute URL, e.g. https://thermaltrace.dev")
    ForwardHandler.upstream = parsed
    http.server.ThreadingHTTPServer((host, port), ForwardHandler).serve_forever()


if __name__ == "__main__":
    main()
