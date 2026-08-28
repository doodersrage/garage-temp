import { defineMiddleware } from "astro:middleware";
import { getAuthFromCookies } from "./lib/auth";
import { pathRequiresAuth } from "./lib/routeAuth";
import { recordServerError } from "./lib/serverErrors";
import { CANONICAL_HOST, LEGACY_HOSTS } from "./lib/siteConfig";

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, hostname, protocol } = context.url;

  if (LEGACY_HOSTS.has(hostname)) {
    const dest = new URL(context.url);
    dest.hostname = CANONICAL_HOST;
    dest.protocol = "https:";
    return context.redirect(dest.toString(), 301);
  }

  if (hostname === CANONICAL_HOST && protocol === "http:") {
    const dest = new URL(context.url);
    dest.protocol = "https:";
    return context.redirect(dest.toString(), 301);
  }

  let userId: string | null = null;

  try {
    if (pathRequiresAuth(pathname)) {
      const { session, user } = await getAuthFromCookies(context.cookies);

      if (!session) {
        if (pathname.startsWith("/api/")) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        return context.redirect("/signin");
      }

      userId = user?.id ?? null;
    }

    return await next();
  } catch (error) {
    // Avoid recursive logging when serving the error page itself.
    if (pathname !== "/500") {
      await recordServerError({
        path: pathname,
        method: context.request.method,
        error,
        userId,
      });
    }

    if (pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (pathname === "/500") {
      return new Response("Internal Server Error", { status: 500 });
    }

    try {
      return context.rewrite("/500");
    } catch {
      return new Response("Internal Server Error", { status: 500 });
    }
  }
});
