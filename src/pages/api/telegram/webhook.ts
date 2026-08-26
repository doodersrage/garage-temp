import type { APIRoute } from "astro";
import { createServerClient } from "../../../lib/supabase";
import {
  getAlertSettingsForUser,
  saveAlertSettingsForUser,
} from "../../../lib/notify";
import {
  snoozeUntilFromHours,
  vacationUntilFromDays,
} from "../../../lib/alertSnooze";
import { getUserHouseholdId } from "../../../lib/households";
import { fetchLatestSensorValues } from "../../../lib/sensorReadings";

async function resolveUserByTelegramSecret(
  secret: string,
): Promise<string | null> {
  if (!secret.trim()) return null;
  const supabase = createServerClient();
  const { data } = await supabase
    .from("alert_settings")
    .select("user_id")
    .eq("telegram_command_secret", secret.trim())
    .maybeSingle();
  return data?.user_id ?? null;
}

async function sendTelegramReply(
  botToken: string,
  chatId: number | string,
  text: string,
): Promise<void> {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export const POST: APIRoute = async ({ request, url }) => {
  const secret = url.searchParams.get("secret")?.trim() ?? "";
  const userId = await resolveUserByTelegramSecret(secret);
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const update = (await request.json()) as {
    message?: { text?: string; chat?: { id?: number } };
  };
  const text = update.message?.text?.trim() ?? "";
  const chatId = update.message?.chat?.id;
  if (!text || chatId == null) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const settings = await getAlertSettingsForUser(userId);
  const token = settings.telegramBotToken;
  if (!token) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const cmd = text.split(/\s+/)[0]?.toLowerCase() ?? "";

  if (cmd === "/snooze") {
    await saveAlertSettingsForUser(userId, {
      ...settings,
      snoozeUntil: snoozeUntilFromHours(24),
    });
    await sendTelegramReply(token, chatId, "Alerts snoozed for 24 hours.");
  } else if (cmd === "/vacation") {
    await saveAlertSettingsForUser(userId, {
      ...settings,
      vacationUntil: vacationUntilFromDays(7),
    });
    await sendTelegramReply(token, chatId, "Vacation mode enabled for 7 days.");
  } else if (cmd === "/status") {
    const householdId = await getUserHouseholdId(userId);
    if (!householdId) {
      await sendTelegramReply(token, chatId, "No active household.");
    } else {
      const latest = await fetchLatestSensorValues(householdId);
      const lines = latest.slice(0, 6).map((row) => {
        const val =
          row.value_num != null
            ? `${row.value_num.toFixed(1)}${row.sensor.unit ?? ""}`
            : row.value_bool != null
              ? row.value_bool
                ? "OPEN"
                : "closed"
              : "—";
        return `${row.sensor.label}: ${val}`;
      });
      await sendTelegramReply(
        token,
        chatId,
        lines.length ? lines.join("\n") : "No readings yet.",
      );
    }
  } else if (cmd === "/help") {
    await sendTelegramReply(
      token,
      chatId,
      "Commands: /status, /snooze, /vacation, /help",
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
