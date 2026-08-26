import { defineMiddleware } from "astro:middleware";
import { getAuthFromCookies } from "./lib/auth";

const protectedPaths = ["/dashboard"];
const protectedApiPrefixes = [
  "/api/user/",
  "/api/garage-temps/",
  "/api/stripe/",
  "/api/admin/",
  "/api/feeds/",
  "/api/home/readings",
  "/api/household",
  "/api/devices",
  "/api/push/",
  "/api/share/manage",
];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const needsAuth =
    protectedPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    ) ||
    protectedApiPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!needsAuth) {
    return next();
  }

  const { session } = await getAuthFromCookies(context.cookies);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return context.redirect("/signin");
  }

  return next();
});
