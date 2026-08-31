#!/usr/bin/env node
/**
 * Ensure the Stripe Customer Portal allows switching among Member / Pro /
 * Portfolio monthly+annual prices.
 *
 * Usage: node --env-file=.env scripts/configure-stripe-portal.mjs
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key?.startsWith("sk_")) {
  console.error("STRIPE_SECRET_KEY missing");
  process.exit(1);
}

const stripe = new Stripe(key);

async function productForPrice(priceId) {
  if (!priceId?.startsWith("price_")) return null;
  const price = await stripe.prices.retrieve(priceId);
  const productId = typeof price.product === "string" ? price.product : price.product.id;
  return { productId, priceId, interval: price.recurring?.interval };
}

const pairs = [
  ["member", process.env.STRIPE_PRICE_ID, process.env.STRIPE_PRICE_ID_ANNUAL],
  ["pro", process.env.STRIPE_PRICE_ID_PRO, process.env.STRIPE_PRICE_ID_PRO_ANNUAL],
  [
    "portfolio",
    process.env.STRIPE_PRICE_ID_PORTFOLIO,
    process.env.STRIPE_PRICE_ID_PORTFOLIO_ANNUAL,
  ],
];

/** @type {Map<string, Set<string>>} */
const byProduct = new Map();

for (const [plan, monthly, annual] of pairs) {
  for (const priceId of [monthly, annual]) {
    const info = await productForPrice(priceId?.trim());
    if (!info) {
      console.warn(`Skipping unset ${plan} price: ${priceId || "(empty)"}`);
      continue;
    }
    if (!byProduct.has(info.productId)) byProduct.set(info.productId, new Set());
    byProduct.get(info.productId).add(info.priceId);
    console.log(`${plan}: ${info.priceId} (${info.interval}) → ${info.productId}`);
  }
}

if (byProduct.size === 0) {
  console.error("No Stripe products found from price IDs");
  process.exit(1);
}

const products = [...byProduct.entries()].map(([product, prices]) => ({
  product,
  prices: [...prices],
  adjustable_quantity: { enabled: false },
}));

const payload = {
  business_profile: {
    headline: "Manage your ThermalTrace subscription",
  },
  features: {
    customer_update: {
      enabled: true,
      allowed_updates: ["email", "address"],
    },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: {
      enabled: true,
      mode: "at_period_end",
      proration_behavior: "none",
    },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ["price"],
      proration_behavior: "create_prorations",
      products,
    },
  },
};

const existing = await stripe.billingPortal.configurations.list({ limit: 10 });
let config = existing.data.find((c) => c.is_default) ?? existing.data[0] ?? null;

if (config) {
  config = await stripe.billingPortal.configurations.update(config.id, payload);
  console.log(`Updated portal configuration ${config.id}`);
} else {
  config = await stripe.billingPortal.configurations.create({
    ...payload,
    default_return_url: process.env.SITE_URL?.replace(/\/+$/, "")
      ? `${process.env.SITE_URL.replace(/\/+$/, "")}/dashboard/history`
      : undefined,
  });
  console.log(`Created portal configuration ${config.id}`);
}

if (!config.is_default) {
  // Stripe only allows one default; update via Dashboard if this fails.
  try {
    config = await stripe.billingPortal.configurations.update(config.id, {
      // @ts-expect-error — some API versions accept active/default via Dashboard only
      active: true,
    });
  } catch {
    /* ignore */
  }
  console.log(
    `Portal config ${config.id} is_default=${config.is_default}. If not default, set it in Stripe Dashboard → Settings → Billing → Customer portal.`,
  );
}

console.log("Portal products:", JSON.stringify(products, null, 2));
