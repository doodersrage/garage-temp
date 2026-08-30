import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getUserEntitlements } from "../../../lib/entitlements";
import { clampIsoToHistoryWindow, historyCutoffIso } from "../../../lib/retentionSchedule";
import { fetchGarageTempChartData } from "../../../lib/garageTempsHistory";
import { getAlertSettingsForUser } from "../../../lib/notify";
import { getUserHouseholdId } from "../../../lib/households";
import { listHouseholdDevices } from "../../../lib/devices";
import { listAlertEventsInRange } from "../../../lib/alertEvents";
import { createServerClient } from "../../../lib/supabase";
import { getSiteUrl } from "../../../lib/stripe";
import {
  buildClaimsPackData,
  buildClaimsPackHtml,
  type ClaimsDeviceSummary,
} from "../../../lib/claimsPack";

function parseDateParam(value: string | null, endOfDay = false): string | undefined {
  if (!value?.trim()) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }
  return parsed.toISOString();
}

function dateQueryValue(iso: string): string {
  return iso.slice(0, 10);
}

export const GET: APIRoute = async ({ cookies, url, request }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const entitlements = await getUserEntitlements(user.id);
  if (!entitlements.canUseClaimsPack) {
    return new Response("Claims pack requires Pro", { status: 403 });
  }

  const rangeFrom = clampIsoToHistoryWindow(
    parseDateParam(url.searchParams.get("from")) ??
      historyCutoffIso(Math.min(30, entitlements.historyDays)),
    entitlements.historyDays,
  );
  const rangeTo =
    parseDateParam(url.searchParams.get("to"), true) ?? new Date().toISOString();

  const windowDays = Math.max(
    1,
    Math.ceil((Date.parse(rangeTo) - Date.parse(rangeFrom)) / (24 * 60 * 60 * 1000)),
  );

  const householdId = await getUserHouseholdId(user.id);
  const [alertSettings, chart, events, devicesResult, householdRow] = await Promise.all([
    getAlertSettingsForUser(user.id, user.user_metadata as Record<string, unknown>),
    fetchGarageTempChartData(user.id, Math.min(windowDays, entitlements.historyDays), {
      from: rangeFrom,
      to: rangeTo,
    }),
    listAlertEventsInRange(user.id, rangeFrom, rangeTo),
    householdId
      ? listHouseholdDevices(householdId)
      : Promise.resolve({ devices: [], error: null }),
    householdId
      ? createServerClient()
          .from("households")
          .select("name")
          .eq("id", householdId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const devices: ClaimsDeviceSummary[] = devicesResult.devices.map((d) => ({
    name: d.name,
    space: d.space ?? null,
    sensors: d.sensors
      .filter((s) => s.visible)
      .map((s) => ({ label: s.label, kind: s.kind })),
  }));

  const siteUrl = getSiteUrl(request).replace(/\/$/, "");
  const fromQ = dateQueryValue(rangeFrom);
  const toQ = dateQueryValue(rangeTo);
  const qs = new URLSearchParams({ from: fromQ, to: toQ }).toString();

  const pack = buildClaimsPackData({
    householdLabel:
      (householdRow.data as { name?: string } | null)?.name?.trim() ||
      user.email ||
      "Household",
    rangeFrom,
    rangeTo,
    freezeThresholdF: alertSettings.freezeThresholdF,
    points: chart.points,
    events,
    devices,
    readingsCsvUrl: `${siteUrl}/api/garage-temps/export.csv?${qs}`,
    alertsCsvUrl: `${siteUrl}/api/alerts/export.csv?${qs}`,
  });

  const html = buildClaimsPackHtml(pack);
  const filename = `thermaltrace-claims-${fromQ}-to-${toQ}.html`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
};
