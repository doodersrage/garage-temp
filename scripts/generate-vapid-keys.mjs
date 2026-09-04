#!/usr/bin/env node
/**
 * Generate a VAPID key pair for @block65/webcrypto-web-push.
 *
 * Public key: base64url of uncompressed P-256 point (0x04 || x || y)
 * Private key: JWK `d` (base64url private scalar) — what webcrypto-web-push expects
 *
 * Usage: node scripts/generate-vapid-keys.mjs
 *    or: pnpm generate:vapid
 */
import { webcrypto } from "node:crypto";

function encodeBase64Url(bytes) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

const keyPair = await webcrypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);

const publicJwk = await webcrypto.subtle.exportKey("jwk", keyPair.publicKey);
const privateJwk = await webcrypto.subtle.exportKey("jwk", keyPair.privateKey);

if (!publicJwk.x || !publicJwk.y || !privateJwk.d) {
  console.error("Failed to export VAPID key material");
  process.exit(1);
}

const x = decodeBase64Url(publicJwk.x);
const y = decodeBase64Url(publicJwk.y);
const publicKey = encodeBase64Url(Buffer.concat([Buffer.from([0x04]), x, y]));
const privateKey = privateJwk.d;

console.log("# Add these to .env / Worker secrets (compatible with @block65/webcrypto-web-push)");
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log("VAPID_SUBJECT=mailto:noreply@thermaltrace.dev");
