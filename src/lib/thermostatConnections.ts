import { createServerClient } from "./supabase";

export type ThermostatProvider = "nest" | "ecobee";

export type ThermostatConnection = {
  id: string;
  householdId: string;
  provider: ThermostatProvider;
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  externalDeviceId: string | null;
  connectedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type ConnectionRow = {
  id: string;
  household_id: string;
  provider: string;
  refresh_token: string;
  access_token: string | null;
  access_token_expires_at: string | null;
  external_device_id: string | null;
  connected_by: string | null;
  created_at: string;
  updated_at: string;
};

function fromRow(row: ConnectionRow): ThermostatConnection {
  return {
    id: row.id,
    householdId: row.household_id,
    provider: row.provider as ThermostatProvider,
    refreshToken: row.refresh_token,
    accessToken: row.access_token,
    accessTokenExpiresAt: row.access_token_expires_at,
    externalDeviceId: row.external_device_id,
    connectedBy: row.connected_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** All connections for a household (at most one per provider). */
export async function listConnectionsForHousehold(
  householdId: string,
): Promise<ThermostatConnection[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("household_thermostat_connections")
    .select(
      "id, household_id, provider, refresh_token, access_token, access_token_expires_at, external_device_id, connected_by, created_at, updated_at",
    )
    .eq("household_id", householdId);
  return ((data ?? []) as ConnectionRow[]).map(fromRow);
}

export async function getConnectionForHousehold(
  householdId: string,
  provider: ThermostatProvider,
): Promise<ThermostatConnection | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("household_thermostat_connections")
    .select(
      "id, household_id, provider, refresh_token, access_token, access_token_expires_at, external_device_id, connected_by, created_at, updated_at",
    )
    .eq("household_id", householdId)
    .eq("provider", provider)
    .maybeSingle();
  return data ? fromRow(data as ConnectionRow) : null;
}

/** Create or replace a household's connection for a provider (one per provider). */
export async function saveConnection(input: {
  householdId: string;
  provider: ThermostatProvider;
  refreshToken: string;
  accessToken?: string | null;
  accessTokenExpiresAt?: string | null;
  externalDeviceId?: string | null;
  connectedBy?: string | null;
}): Promise<{ error: string | null }> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("household_thermostat_connections")
    .upsert(
      {
        household_id: input.householdId,
        provider: input.provider,
        refresh_token: input.refreshToken,
        access_token: input.accessToken ?? null,
        access_token_expires_at: input.accessTokenExpiresAt ?? null,
        external_device_id: input.externalDeviceId ?? null,
        connected_by: input.connectedBy ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "household_id,provider" },
    );
  return { error: error?.message ?? null };
}

/** Update just the access token after a lazy refresh (keeps refresh_token as-is unless the provider rotated it). */
export async function updateTokensAfterRefresh(
  householdId: string,
  provider: ThermostatProvider,
  tokens: { accessToken: string; refreshToken?: string; expiresAtMs: number },
): Promise<{ error: string | null }> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("household_thermostat_connections")
    .update({
      access_token: tokens.accessToken,
      access_token_expires_at: new Date(tokens.expiresAtMs).toISOString(),
      updated_at: new Date().toISOString(),
      ...(tokens.refreshToken ? { refresh_token: tokens.refreshToken } : {}),
    })
    .eq("household_id", householdId)
    .eq("provider", provider);
  return { error: error?.message ?? null };
}

export async function deleteConnection(
  householdId: string,
  provider: ThermostatProvider,
): Promise<{ error: string | null }> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("household_thermostat_connections")
    .delete()
    .eq("household_id", householdId)
    .eq("provider", provider);
  return { error: error?.message ?? null };
}
