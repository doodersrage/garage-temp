// @ts-check
import { defineConfig, memoryCache, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import cloudflare from '@astrojs/cloudflare';

import preact from '@astrojs/preact';

import sentry from '@sentry/astro';

import { buildPublicSitemapUrls } from './src/lib/sitemapPages.ts';

const site = process.env.SITE_URL?.replace(/\/+$/, "") || "https://thermaltrace.dev";
const sentryDsn = process.env.SENTRY_DSN?.trim() || process.env.PUBLIC_SENTRY_DSN?.trim() || "";
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim() || "";
const sentryOrg = process.env.SENTRY_ORG?.trim() || "thermaltracedev";
const sentryProject = process.env.SENTRY_PROJECT?.trim() || "";

/** @param {string} key */
function defineProcessEnv(key) {
  return JSON.stringify(process.env[key]?.trim() || "");
}

/** @param {string} pageUrl */
function isIndexablePublicPage(pageUrl) {
  return (
    !pageUrl.includes("/dashboard") &&
    !pageUrl.includes("/api/") &&
    !pageUrl.includes("/signin") &&
    !pageUrl.includes("/register") &&
    !pageUrl.includes("/forgot-password") &&
    !pageUrl.includes("/reset-password") &&
    !pageUrl.includes("/invite/") &&
    !pageUrl.includes("/share/") &&
    !pageUrl.includes("/status/") &&
    !pageUrl.includes("/500") &&
    !pageUrl.includes("/embed/")
  );
}

// https://astro.build/config
export default defineConfig({
  site,

  server: {
    host: true
  },

  adapter: cloudflare({
    // platformProxy is supported at runtime; generated Options types lag behind.
    // @ts-expect-error Astro Cloudflare Options may omit platformProxy
    platformProxy: {
      enabled: true,
    },
    imageService: 'passthrough',
    prerenderEnvironment: 'node',
  }),
  
  image: {
    service: {
      entrypoint: '@astrojs/cloudflare/image-service',
    },
  },

  vite: {
    plugins: [tailwindcss()],
    define: {
      // DSN is public by design; expose for the browser SDK.
      'import.meta.env.PUBLIC_SENTRY_DSN': JSON.stringify(
        process.env.PUBLIC_SENTRY_DSN?.trim() || sentryDsn,
      ),
      'import.meta.env.SENTRY_DSN': JSON.stringify(sentryDsn),
      // Stripe display/price IDs are not PUBLIC_-prefixed, so Vite skips them unless defined.
      'import.meta.env.STRIPE_DISPLAY_MEMBER_MONTHLY': defineProcessEnv('STRIPE_DISPLAY_MEMBER_MONTHLY'),
      'import.meta.env.STRIPE_DISPLAY_MEMBER_ANNUAL': defineProcessEnv('STRIPE_DISPLAY_MEMBER_ANNUAL'),
      'import.meta.env.STRIPE_DISPLAY_PRO_MONTHLY': defineProcessEnv('STRIPE_DISPLAY_PRO_MONTHLY'),
      'import.meta.env.STRIPE_DISPLAY_PRO_ANNUAL': defineProcessEnv('STRIPE_DISPLAY_PRO_ANNUAL'),
      'import.meta.env.STRIPE_DISPLAY_PORTFOLIO_MONTHLY': defineProcessEnv('STRIPE_DISPLAY_PORTFOLIO_MONTHLY'),
      'import.meta.env.STRIPE_DISPLAY_PORTFOLIO_ANNUAL': defineProcessEnv('STRIPE_DISPLAY_PORTFOLIO_ANNUAL'),
      'import.meta.env.STRIPE_PRICE_ID': defineProcessEnv('STRIPE_PRICE_ID'),
      'import.meta.env.STRIPE_PRICE_ID_ANNUAL': defineProcessEnv('STRIPE_PRICE_ID_ANNUAL'),
      'import.meta.env.STRIPE_PRICE_ID_PRO': defineProcessEnv('STRIPE_PRICE_ID_PRO'),
      'import.meta.env.STRIPE_PRICE_ID_PRO_ANNUAL': defineProcessEnv('STRIPE_PRICE_ID_PRO_ANNUAL'),
      'import.meta.env.STRIPE_PRICE_ID_PORTFOLIO': defineProcessEnv('STRIPE_PRICE_ID_PORTFOLIO'),
      'import.meta.env.STRIPE_PRICE_ID_PORTFOLIO_ANNUAL': defineProcessEnv('STRIPE_PRICE_ID_PORTFOLIO_ANNUAL'),
      'import.meta.env.YUBICO_CLIENT_ID': defineProcessEnv('YUBICO_CLIENT_ID'),
    },
    // Pre-warm Astro Actions runtime so Cloudflare prerender doesn't race
    // a mid-build optimizeDeps reload (missing chunk-*.js in CI).
    optimizeDeps: {
      include: ["astro/actions/runtime/entrypoints/route.js"],
    },
    ssr: {
      optimizeDeps: {
        include: ["astro/actions/runtime/entrypoints/route.js"],
      },
    },
  },

  security: {
    // Keep false: companion apps and ingest clients often POST without a browser Origin.
    // Cookie auth relies on SameSite=Lax + Turnstile on public forms.
    checkOrigin: false
  },

  output: 'server',
  integrations: [
    sitemap({
      filter: (page) => isIndexablePublicPage(page),
      customPages: buildPublicSitemapUrls(site),
    }),
    preact(),
    sentry({
      // Cloudflare Worker entry (`src/worker.ts`) owns server init via withSentry.
      // Keep Astro integration for client SDK + source map upload only.
      enabled: {
        client: true,
        server: false,
      },
      sourceMapsUploadOptions: {
        enabled: Boolean(sentryAuthToken && sentryOrg && sentryProject),
        org: sentryOrg,
        project: sentryProject || undefined,
        authToken: sentryAuthToken || undefined,
      },
      sentryUrl: process.env.SENTRY_URL?.trim() || "https://us.sentry.io",
    }),
  ],

  experimental: {
    cache: {
      provider: memoryCache(),
    },
  },

  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Plus Jakarta Sans',
      cssVariable: "--font-sans",
      subsets: ['latin'],
      weights: ['400', '600', '700'],
    },
    {
      provider: fontProviders.google(),
      name: 'Sora',
      cssVariable: "--font-display",
      subsets: ['latin'],
      weights: ['600', '700'],
    },
  ],
  
});
