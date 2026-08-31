#!/usr/bin/env node
/**
 * Compare STRIPE_DISPLAY_* env amounts to live Stripe price unit amounts.
 * Usage: node --env-file=.env scripts/audit-stripe-prices.mjs
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key?.startsWith("sk_")) {
  console.error("STRIPE_SECRET_KEY missing");
  process.exit(1);
}

const stripe = new Stripe(key);
const rows = [
  ["member", "monthly", process.env.STRIPE_PRICE_ID, process.env.STRIPE_DISPLAY_MEMBER_MONTHLY],
  ["member", "annual", process.env.STRIPE_PRICE_ID_ANNUAL, process.env.STRIPE_DISPLAY_MEMBER_ANNUAL],
  ["pro", "monthly", process.env.STRIPE_PRICE_ID_PRO, process.env.STRIPE_DISPLAY_PRO_MONTHLY],
  ["pro", "annual", process.env.STRIPE_PRICE_ID_PRO_ANNUAL, process.env.STRIPE_DISPLAY_PRO_ANNUAL],
  ["portfolio", "monthly", process.env.STRIPE_PRICE_ID_PORTFOLIO, process.env.STRIPE_DISPLAY_PORTFOLIO_MONTHLY],
  ["portfolio", "annual", process.env.STRIPE_PRICE_ID_PORTFOLIO_ANNUAL, process.env.STRIPE_DISPLAY_PORTFOLIO_ANNUAL],
];

let mismatches = 0;
for (const [plan, interval, priceId, displayRaw] of rows) {
  const display = displayRaw?.trim() ? Number(displayRaw) : null;
  if (!priceId) {
    console.log(`${plan}/${interval}: MISSING price id (display=${display ?? "—"})`);
    mismatches += 1;
    continue;
  }
  try {
    const price = await stripe.prices.retrieve(priceId);
    const stripeUsd =
      typeof price.unit_amount === "number" ? price.unit_amount / 100 : null;
    const match =
      stripeUsd != null && display != null && Math.abs(stripeUsd - display) < 0.01;
    if (!match) mismatches += 1;
    console.log(
      `${plan}/${interval}: stripe=$${stripeUsd} display=$${display ?? "—"} ${match ? "OK" : "MISMATCH"} active=${price.active}`,
    );
  } catch (error) {
    mismatches += 1;
    console.log(`${plan}/${interval}: ERROR ${error instanceof Error ? error.message : error}`);
  }
}

process.exit(mismatches > 0 ? 2 : 0);
