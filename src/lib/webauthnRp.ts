import { buildSiteUrl } from "./siteUrl";

export type WebAuthnRp = {
  rpId: string;
  rpOrigins: string[];
};

/** Relying party id + allowed origins for Supabase WebAuthn MFA (must match production hostname). */
export function resolveWebAuthnRp(request?: Request): WebAuthnRp {
  const siteUrl = buildSiteUrl(request);
  const { hostname, origin } = new URL(siteUrl);
  return {
    rpId: hostname,
    rpOrigins: [origin],
  };
}
