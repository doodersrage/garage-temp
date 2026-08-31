/** Prefer JSON 401/403 for XHR/fetch; redirect browser form navigations to sign-in. */
export function prefersJsonAuthError(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("application/json") && !accept.includes("text/html")) {
    return true;
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return true;
  }

  // Explicit form posts from HTML pages should redirect, not get JSON.
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    return false;
  }

  // Default API clients (Playwright request JSON, curl -d '{}') → JSON errors.
  return request.headers.has("authorization") || pathnameLooksLikeRestFetch(accept);
}

function pathnameLooksLikeRestFetch(accept: string): boolean {
  // Empty or */* from APIRequestContext → treat as JSON API.
  return !accept || accept === "*/*";
}
