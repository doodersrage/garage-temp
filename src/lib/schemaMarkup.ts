const SITE_NAME = "Garage Temperature Monitor";
const DEFAULT_DESCRIPTION =
  "Monitor garage temperature and humidity with Arduino probes, JSON feeds, live dashboards, and historic CSV export.";

export function getDefaultDescription(): string {
  return DEFAULT_DESCRIPTION;
}

export function getSiteName(): string {
  return SITE_NAME;
}

export function resolveSiteUrl(siteUrl?: string | URL | null): string {
  if (siteUrl) {
    return siteUrl.toString().replace(/\/+$/, "");
  }

  return "https://garage-temp.robmcd.name";
}

export function resolvePageUrl(siteUrl: string, pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${siteUrl}${normalizedPath}`;
}

export function getOrganizationSchema(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/favicon.svg`,
  };
}

export function getWebSiteSchema(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
    description: DEFAULT_DESCRIPTION,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };
}

export function getWebPageSchema(options: {
  siteUrl: string;
  pageUrl: string;
  name: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: options.name,
    description: options.description,
    url: options.pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: options.siteUrl,
    },
  };
}

export function getArticleSchema(options: {
  siteUrl: string;
  pageUrl: string;
  headline: string;
  description: string;
  imageUrl?: string;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: options.headline,
    description: options.description,
    url: options.pageUrl,
    mainEntityOfPage: options.pageUrl,
    image: options.imageUrl ? [options.imageUrl] : undefined,
    datePublished: options.datePublished ?? "2024-01-01",
    dateModified: options.dateModified ?? new Date().toISOString().slice(0, 10),
    author: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${options.siteUrl}/favicon.svg`,
      },
    },
  };
}

export function getBreadcrumbSchema(
  siteUrl: string,
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: resolvePageUrl(siteUrl, item.path),
    })),
  };
}

export function getSiteSchemas(options: {
  siteUrl: string;
  pageUrl: string;
  pageName: string;
  pageDescription: string;
  extraSchemas?: Record<string, unknown>[];
}) {
  return [
    getOrganizationSchema(options.siteUrl),
    getWebSiteSchema(options.siteUrl),
    getWebPageSchema({
      siteUrl: options.siteUrl,
      pageUrl: options.pageUrl,
      name: options.pageName,
      description: options.pageDescription,
    }),
    ...(options.extraSchemas ?? []),
  ];
}
