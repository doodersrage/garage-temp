import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getOrCreateHouseholdForUser } from "../../../lib/households";
import { createPushDevice, listHouseholdDevices } from "../../../lib/devices";
import { getUserEntitlements } from "../../../lib/entitlements";
import { createServerClient } from "../../../lib/supabase";

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { user } = await getAuthFromCookies(cookies);
  if (!user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard/temperature";
  const action = formData.get("action")?.toString() ?? "create_push";
  const entitlements = await getUserEntitlements(user.id);
  const household = await getOrCreateHouseholdForUser(user.id, user.email);

  if (!household.householdId) {
    return redirect(`${redirectTo}?error=1`);
  }

  const existing = await listHouseholdDevices(household.householdId);
  if (existing.devices.length >= entitlements.maxDevices) {
    return redirect(`${redirectTo}?error=device_limit`);
  }

  if (action === "delete") {
    const deviceId = formData.get("device_id")?.toString();
    if (deviceId) {
      const supabase = createServerClient();
      await supabase
        .from("devices")
        .delete()
        .eq("id", deviceId)
        .eq("household_id", household.householdId);
    }
    return redirect(`${redirectTo}?device_deleted=1`);
  }

  if (action === "add_sensor") {
    const deviceId = formData.get("device_id")?.toString();
    const key = formData.get("key")?.toString().trim();
    const label = formData.get("label")?.toString().trim();
    const kind = formData.get("kind")?.toString() ?? "generic";
    const unit = formData.get("unit")?.toString().trim() || null;

    if (!deviceId || !key || !label) {
      return redirect(`${redirectTo}?error=1`);
    }

    const supabase = createServerClient();
    await supabase.from("device_sensors").insert({
      device_id: deviceId,
      key,
      label,
      kind,
      unit,
      visible: true,
    });

    return redirect(`${redirectTo}?sensor_added=1`);
  }

  const name = formData.get("name")?.toString().trim() || "Push device";
  const rawKey = randomKey();
  const hash = await sha256Hex(rawKey);
  const prefix = rawKey.slice(0, 8);

  const { error } = await createPushDevice(
    household.householdId,
    name,
    hash,
    prefix,
  );

  if (error) {
    return redirect(`${redirectTo}?error=1`);
  }

  // Pass key once via query (user must copy immediately)
  return redirect(
    `${redirectTo}?ingest_key=${encodeURIComponent(rawKey)}&device_created=1`,
  );
};
