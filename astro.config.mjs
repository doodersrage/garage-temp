// @ts-check
import { defineConfig, memoryCache, fontProviders } from 'astro/config';

import node from '@astrojs/node';

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
  integrations: [sitemap(), preact()],

  experimental: {
    cache: {
      provider: memoryCache(),
    },
  },

  fonts: [{
    provider: fontProviders.google(),
    name: 'Roboto',
    cssVariable: "--font-roboto",
    subsets: ['sans-serif'],
    weights: ['400', '500', '700'],
  },
  {
    provider: fontProviders.google(),
    name: 'Playfair Display',
    cssVariable: "--font-playfair",
    subsets: ['latin'],
    weights: ['400', '500', '700'],
  }],
  
});