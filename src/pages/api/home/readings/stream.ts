import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../../lib/auth";
import { fetchTemps } from "../../../../lib/FetchTemps";
import { getUserPreferences } from "../../../../lib/userPreferences";
import { getUserDevicesAsTempConfig } from "../../../../lib/devices";
import { fetchLatestSensorValues } from "../../../../lib/sensorReadings";

export const GET: APIRoute = async ({ cookies, request }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  request.signal.addEventListener("abort", () => {
    closed = true;
  });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
      };

      send({ type: "connected", at: new Date().toISOString() });

      while (!closed) {
        try {
          const preferences = await getUserPreferences(user);
          const deviceConfig = await getUserDevicesAsTempConfig(
            user.id,
            user.email,
          );
          const visibleProbes = preferences.tempProbes.filter((p) => p.visible);
          const results = await fetchTemps({
            feeds:
              preferences.tempFeeds.length > 0
                ? preferences.tempFeeds
                : deviceConfig.feeds,
            probes:
              visibleProbes.length > 0 ? visibleProbes : deviceConfig.probes,
            devices: deviceConfig.devices,
            householdId: deviceConfig.householdId,
            saveToDatabase: false,
            userId: user.id,
            userEmail: user.email,
            userMetadata: user.user_metadata as Record<string, unknown>,
          });

          let sensorCount = 0;
          if (deviceConfig.householdId) {
            const latest = await fetchLatestSensorValues(deviceConfig.householdId);
            sensorCount = latest.length;
          }

          send({
            type: "readings",
            at: new Date().toISOString(),
            feedCount: results.length,
            sensorCount,
          });
        } catch (error) {
          send({
            type: "error",
            message: error instanceof Error ? error.message : "poll failed",
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 30000));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
