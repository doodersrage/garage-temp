#!/usr/bin/env node
/**
 * Smoke-check Portfolio billing wiring without completing a purchase.
 * Usage: node --env-file=.env scripts/smoke-portfolio-billing.mjs
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key?.startsWith("sk_")) {
  console.error("STRIPE_SECRET_KEY missing");
  process.exit(1);
}

const stripe = new Stripe(key);
const site = (process.env.SITE_URL || "https://thermaltrace.dev").replace(/\/+$/, "");

const monthly = process.env.STRIPE_PRICE_ID_PORTFOLIO?.trim();
const annual = process.env.STRIPE_PRICE_ID_PORTFOLIO_ANNUAL?.trim();
const displayM = process.env.STRIPE_DISPLAY_PORTFOLIO_MONTHLY?.trim();
const displayA = process.env.STRIPE_DISPLAY_PORTFOLIO_ANNUAL?.trim();

let failed = false;
function check(ok, msg) {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) failed = true;
}

check(Boolean(monthly?.startsWith("price_")), `STRIPE_PRICE_ID_PORTFOLIO=${monthly || "(missing)"}`);
check(Boolean(annual?.startsWith("price_")), `STRIPE_PRICE_ID_PORTFOLIO_ANNUAL=${annual || "(missing)"}`);
check(Boolean(displayM), `STRIPE_DISPLAY_PORTFOLIO_MONTHLY=${displayM || "(missing)"}`);
check(Boolean(displayA), `STRIPE_DISPLAY_PORTFOLIO_ANNUAL=${displayA || "(missing)"}`);

for (const [label, priceId, expectedInterval, expectedUsd] of [
  ["monthly", monthly, "month", Number(displayM)],
  ["annual", annual, "year", Number(displayA)],
]) {
  if (!priceId?.startsWith("price_")) continue;
  try {
    const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
    const product = typeof price.product === "string" ? null : price.product;
    const usd = typeof price.unit_amount === "number" ? price.unit_amount / 100 : null;
    check(price.active, `${label} price active`);
    check(price.recurring?.interval === expectedInterval, `${label} interval=${price.recurring?.interval}`);
    check(
      usd != null && Number.isFinite(expectedUsd) && Math.abs(usd - expectedUsd) < 0.01,
      `${label} amount $${usd} matches display $${expectedUsd}`,
    );
    check(
      Boolean(product?.name?.includes("Portfolio")),
      `${label} product name="${product?.name ?? "?"}"`,
    );
  } catch (error) {
    check(false, `${label} retrieve failed: ${error instanceof Error ? error.message : error}`);
  }
}

// Create + expire checkout sessions to prove both prices are checkout-eligible.
for (const [label, priceId] of [
  ["monthly", monthly],
  ["annual", annual],
]) {
  if (!priceId?.startsWith("price_")) continue;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${site}/dashboard/history?subscription=success`,
      cancel_url: `${site}/dashboard/history?subscription=cancelled`,
      metadata: { plan_tier: "portfolio", billing_interval: label, smoke: "1" },
      subscription_data: {
        metadata: { plan_tier: "portfolio", billing_interval: label, smoke: "1" },
      },
    });
    check(Boolean(session.url), `${label} checkout session created`);
    await stripe.checkout.sessions.expire(session.id);
    check(true, `${label} checkout session expired (no charge)`);
  } catch (error) {
    check(false, `${label} checkout failed: ${error instanceof Error ? error.message : error}`);
  }
}

const portals = await stripe.billingPortal.configurations.list({ limit: 5 });
const portalId = portals.data.find((c) => c.active)?.id ?? portals.data[0]?.id;
if (!portalId) {
  check(false, "No Customer Portal configuration — run: node --env-file=.env scripts/configure-stripe-portal.mjs");
} else {
  const portal = await stripe.billingPortal.configurations.retrieve(portalId, {
    expand: ["features.subscription_update.products"],
  });
  const products = portal.features.subscription_update?.products ?? [];
  const priceIds = new Set(
    products.flatMap((p) => (Array.isArray(p.prices) ? p.prices : [])),
  );
  check(
    portal.features.subscription_update?.enabled === true,
    `Portal subscription_update enabled (config ${portal.id})`,
  );
  check(priceIds.has(monthly), "Portal includes Portfolio monthly price");
  check(priceIds.has(annual), "Portal includes Portfolio annual price");
}

process.exit(failed ? 1 : 0);
