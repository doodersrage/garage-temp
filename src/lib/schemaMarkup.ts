import { BRAND_DESCRIPTION, BRAND_NAME } from "./brand";
import {
  resolveConfiguredSiteUrl as resolveSiteUrl,
  resolvePageUrl,
} from "./siteConfig";

export { resolveSiteUrl, resolvePageUrl };

const SITE_NAME = BRAND_NAME;
const DEFAULT_DESCRIPTION = BRAND_DESCRIPTION;

export function getDefaultDescription(): string {
  return DEFAULT_DESCRIPTION;
}

export function getSiteName(): string {
  return SITE_NAME;
}

export function getOrganizationSchema(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/logo.svg`,
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
        url: `${options.siteUrl}/logo.svg`,
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

export function getFaqPageSchema(
  pageUrl: string,
  faqs: Array<{ question: string; answer: string }>,
) {
  if (faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
    url: pageUrl,
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
