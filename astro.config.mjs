// @ts-check
import { defineConfig, memoryCache, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import cloudflare from '@astrojs/cloudflare';

import preact from '@astrojs/preact';

// https://astro.build/config
export default defineConfig({
  site: 'https://garage-temp.robmcd.name',

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
    checkOrigin: false
  },

  output: 'server',
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes("/dashboard") &&
        !page.includes("/api/") &&
        !page.includes("/signin") &&
        !page.includes("/register"),
    }),
    preact(),
  ],

  experimental: {
    cache: {
      provider: memoryCache(),
    },
  },

  fonts: [{
    provider: fontProviders.google(),
    name: 'Inter',
    cssVariable: "--font-sans",
    subsets: ['latin'],
    weights: ['400', '500', '600', '700'],
  }],
  
});