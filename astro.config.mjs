// @ts-check
import { defineConfig, memoryCache } from 'astro/config';

import node from '@astrojs/node';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://garage-temp.robmcd.name',

  server: {
    host: true
  },

  adapter: node({
    mode: 'standalone'
  }),

  vite: {
    plugins: [tailwindcss()]
  },

  security: {
    checkOrigin: false
  },

  output: 'server',
  integrations: [sitemap()],

  experimental: {
    cache: {
      provider: memoryCache(),
    },
  },
});