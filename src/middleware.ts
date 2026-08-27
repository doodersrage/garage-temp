import { defineMiddleware } from "astro:middleware";
import { getAuthFromCookies } from "./lib/auth";
import { pathRequiresAuth } from "./lib/routeAuth";
import { recordServerError } from "./lib/serverErrors";

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
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
    await recordServerError({
      path: pathname,
      method: context.request.method,
      error,
      userId,
    });

    if (pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      return context.rewrite("/500");
    } catch {
      return new Response("Internal Server Error", { status: 500 });
    }
  }
});
