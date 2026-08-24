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
    plugins: [tailwindcss()]
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