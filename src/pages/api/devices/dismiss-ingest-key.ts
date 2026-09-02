import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { clearSecretFlash, FLASH_INGEST_KEY } from "../../../lib/secretFlash";

export const POST: APIRoute = async ({ cookies }) => {
  const { session } = await getAuthFromCookies(cookies);
  if (!session) {
    return new Response(JSON.stringify({ ok: false }), { status: 401 });
  }

  clearSecretFlash(cookies, FLASH_INGEST_KEY);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
