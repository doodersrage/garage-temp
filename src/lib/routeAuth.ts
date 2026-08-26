/** Session-auth route rules shared by middleware and tests. */

const protectedPaths = ["/dashboard"];

/** Session-protected API prefixes. Exact public exceptions win first. */
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

/** Public endpoints that would otherwise match a protected prefix. */
const publicApiExactPaths = new Set([
  "/api/stripe/webhook",
  "/api/home/demo-temps",
  "/api/home/weather",
]);

export function pathRequiresAuth(pathname: string): boolean {
  if (publicApiExactPaths.has(pathname)) {
    return false;
  }

  return (
    protectedPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    ) || protectedApiPrefixes.some((prefix) => pathname.startsWith(prefix))
  );
}
