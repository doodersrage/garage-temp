/**
 * Defense-in-depth guard against a user-supplied URL that the *server*
 * will fetch (feed polling, outbound webhooks) targeting a private,
 * loopback, link-local, or otherwise non-public address.
 *
 * Cloudflare Workers already blocks a Worker's fetch() from reaching
 * private/internal network targets at the platform level -- outbound
 * requests go through a proxy that only allows a public Internet service
 * or the Worker's own zone origin (see Cloudflare's Workers security
 * model docs). So this check is a belt-and-suspenders layer, not the only
 * thing standing between an attacker and an internal service: it rejects
 * obviously-bad input up front with a clear error instead of a generic
 * fetch failure, and it isn't dependent on the accuracy of Cloudflare's
 * platform behavior for correctness. It does NOT do DNS resolution (not
 * practical to do safely/cheaply from within a Worker, and Cloudflare's
 * own fetch-time proxy already covers DNS-rebinding-style bypasses of a
 * hostname-only check) -- it only catches IP literals and obvious
 * loopback/local hostnames typed directly into the URL.
 */

function isBlockedIPv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  const octets = parts.map(Number);
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = octets as [number, number, number, number];

  if (a === 127) return true; // loopback
  if (a === 10) return true; // RFC1918
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata 169.254.169.254)
  if (a === 0) return true; // "this network"
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isBlockedIPv6(host: string): boolean {
  const normalized = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (normalized === "::1") return true; // loopback
  if (normalized === "::") return true; // unspecified
  if (/^fe[89ab][0-9a-f]:/.test(normalized)) return true; // link-local fe80::/10
  if (/^f[cd][0-9a-f]{2}:/.test(normalized)) return true; // unique local fc00::/7
  // IPv4-mapped/compatible IPv6 embedding a blocked IPv4 (e.g. ::ffff:127.0.0.1)
  const mapped = /^::(ffff:)?(\d+\.\d+\.\d+\.\d+)$/.exec(normalized);
  if (mapped) return isBlockedIPv4(mapped[2]!);
  return false;
}

export function isBlockedFetchHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.includes(":")) return isBlockedIPv6(host); // IPv6 literal
  return isBlockedIPv4(host);
}

/** True if `url` is https and not pointed at a private/loopback/link-local host. */
export function isSafeHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !isBlockedFetchHost(parsed.hostname);
  } catch {
    return false;
  }
}
