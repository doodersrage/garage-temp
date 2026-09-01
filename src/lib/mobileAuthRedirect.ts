import type { AstroCookies } from "astro";
import {
  createMobileExchangeToken,
  MOBILE_APP_SCHEME,
  MOBILE_OAUTH_CALLBACK_PATH,
  MOBILE_OAUTH_COOKIE,
} from "./mobileAuthExchange";

export function setMobileOAuthCookie(cookies: AstroCookies): void {
  cookies.set(MOBILE_OAUTH_COOKIE, "1", {
    path: "/",
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    maxAge: 60 * 10,
  });
}

export function consumeMobileOAuthCookie(cookies: AstroCookies): boolean {
  const value = cookies.get(MOBILE_OAUTH_COOKIE)?.value === "1";
  cookies.delete(MOBILE_OAUTH_COOKIE, { path: "/" });
  return value;
}

/** Redirect native app to exchange tokens after web OAuth completes. */
export async function redirectMobileOAuthComplete(
  accessToken: string,
  refreshToken: string,
): Promise<Response | null> {
  const exchange = await createMobileExchangeToken(accessToken, refreshToken);
  if (!exchange) return null;

  const location = `${MOBILE_APP_SCHEME}://${MOBILE_OAUTH_CALLBACK_PATH}?exchange=${encodeURIComponent(exchange)}`;
  return new Response(null, {
    status: 302,
    headers: { Location: location },
  });
}
