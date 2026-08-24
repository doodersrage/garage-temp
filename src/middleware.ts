import { defineMiddleware } from "astro:middleware";

const protectedPaths = ["/dashboard"];
const protectedApiPrefixes = [
  "/api/user/",
  "/api/garage-temps/",
  "/api/stripe/",
  "/api/admin/",
  "/api/feeds/",
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

  const accessToken = context.cookies.get("sb-access-token")?.value;
  const refreshToken = context.cookies.get("sb-refresh-token")?.value;

  if (!accessToken || !refreshToken) {
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
