import { defineConfig } from "vitepress";

const site = "https://thermaltrace.dev";

export default defineConfig({
  title: "ThermalTrace Docs",
  description:
    "Developer docs for ThermalTrace — ingest API, sensor sketches, and OpenAPI.",
  base: "/thermaltrace/",
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ["link", { rel: "icon", href: `${site}/favicon.svg` }],
    ["meta", { name: "theme-color", content: "#090b0f" }],
  ],
  themeConfig: {
    logo: { src: `${site}/favicon.svg`, alt: "ThermalTrace" },
    siteTitle: "ThermalTrace",
    nav: [
      { text: "App", link: site },
      { text: "About hub", link: `${site}/about` },
      { text: "GitHub", link: "https://github.com/doodersrage/thermaltrace" },
    ],
    sidebar: [
      {
        text: "Start",
        items: [
          { text: "Overview", link: "/" },
          { text: "Push ingest", link: "/ingest" },
          { text: "HTTP API", link: "/api" },
          { text: "Sensor sketches", link: "/sketches" },
        ],
      },
      {
        text: "On the product site",
        items: [
          { text: "Guides & journeys", link: `${site}/about` },
          { text: "In-app API page", link: `${site}/docs/api` },
          { text: "Pricing", link: `${site}/pricing` },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/doodersrage/thermaltrace" },
    ],
    footer: {
      message: "Full product guides live on thermaltrace.dev — this site is for developers.",
      copyright: "Copyright © ThermalTrace",
    },
    search: { provider: "local" },
    editLink: {
      pattern:
        "https://github.com/doodersrage/thermaltrace/edit/main/docs/:path",
      text: "Edit on GitHub",
    },
  },
});
