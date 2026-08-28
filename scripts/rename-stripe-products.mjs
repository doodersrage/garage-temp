#!/usr/bin/env node
/**
 * Rename Stripe product display names to ThermalTrace tiers (optional one-time).
 * Usage: node --env-file=.env scripts/rename-stripe-products.mjs
 */
import Stripe from "stripe";

const renames = [
  { match: /garage|member/i, name: "ThermalTrace Member" },
  { match: /pro/i, name: "ThermalTrace Pro" },
  { match: /free/i, name: "ThermalTrace Free" },
];

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key) {
  console.error("STRIPE_SECRET_KEY required");
  process.exit(1);
}

const stripe = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
const products = await stripe.products.list({ limit: 100, active: true });

let updated = 0;
for (const product of products.data) {
  const rule = renames.find((r) => r.match.test(product.name));
  if (!rule || product.name === rule.name) continue;
  await stripe.products.update(product.id, { name: rule.name });
  console.log(`Renamed: ${product.name} → ${rule.name}`);
  updated += 1;
}

console.log(updated ? `Updated ${updated} product(s).` : "No products needed renaming.");
