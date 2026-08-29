import * as Sentry from "@sentry/astro";

const dsn =
  import.meta.env.PUBLIC_SENTRY_DSN?.trim() ||
  import.meta.env.SENTRY_DSN?.trim() ||
  "";

if (dsn && dsn !== "off") {
  Sentry.init({
    dsn,
    environment: import.meta.env.PROD ? "production" : "development",
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.5,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
  });
}
