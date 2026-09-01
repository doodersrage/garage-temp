import { defineMiddleware } from "astro:middleware";
import { getAuthFromCookies } from "./lib/auth";
import { prefersJsonAuthError } from "./lib/authResponse";
import { pathRequiresAuth } from "./lib/routeAuth";
import {
  buildMfaChallengeUrl,
  getAalClaim,
  isMfaCheckedNotRequired,
  isMfaRequiredCookieSet,
  sessionNeedsMfaStepUp,
  setMfaRequiredCookie,
} from "./lib/mfa";
import { recordServerError } from "./lib/serverErrors";
import { CANONICAL_HOST, LEGACY_HOSTS } from "./lib/siteConfig";

function isMfaExemptPath(pathname: string): boolean {
  return (
    pathname === "/signin/mfa" ||
    pathname === "/api/auth/mfa-verify" ||
    pathname === "/api/auth/mfa-manage" ||
    pathname === "/api/auth/signout" ||
    pathname === "/api/auth/set-session" ||
    // Password recovery session is typically aal1; allow completing reset.
    pathname === "/api/auth/update-password" ||
    pathname === "/reset-password"
  );
}

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
        if (pathname.startsWith("/api/") && prefersJsonAuthError(context.request)) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        return context.redirect("/signin");
      }

      userId = user?.id ?? null;

      if (!isMfaExemptPath(pathname)) {
        const aal = getAalClaim(session.access_token);
        let needsMfa = false;

        if (aal === "aal2") {
          setMfaRequiredCookie(context.cookies, false);
        } else if (isMfaRequiredCookieSet(context.cookies)) {
          needsMfa = true;
        } else if (isMfaCheckedNotRequired(context.cookies)) {
          needsMfa = false;
        } else if (aal === "aal1") {
          needsMfa = await sessionNeedsMfaStepUp(
            session.access_token,
            session.refresh_token,
            user,
          );
          setMfaRequiredCookie(context.cookies, needsMfa);
        }

        if (needsMfa) {
          if (pathname.startsWith("/api/") && prefersJsonAuthError(context.request)) {
            return new Response(JSON.stringify({ error: "MFA required" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }
          return context.redirect(buildMfaChallengeUrl(pathname));
        }
      }
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
