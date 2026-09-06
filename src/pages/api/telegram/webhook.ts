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
import {
  filterRowsByLabel,
  parseTelegramSnoozeHours,
  parseTelegramVacationDays,
  telegramStatusQuery,
  TELEGRAM_HELP,
} from "../../../lib/telegramCommands";
import { checkTelegramWebhookRateLimit } from "../../../lib/telegramWebhookLimits";
import { timingSafeEqual } from "../../../lib/timingSafeEqual";

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

function resolveTelegramSecret(request: Request, _url: URL): string {
  // Prefer Telegram's official secret header only — query ?secret= leaks via
  // Referer/logs and is no longer accepted.
  return request.headers.get("X-Telegram-Bot-Api-Secret-Token")?.trim() ?? "";
}

export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  const rate = checkTelegramWebhookRateLimit(clientAddress ?? "unknown");
  if (!rate.ok) {
    return new Response("Rate limit exceeded", {
      status: 429,
      headers: rate.retryAfterSec ? { "Retry-After": String(rate.retryAfterSec) } : {},
    });
  }

  const secret = resolveTelegramSecret(request, url);
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

  // Require a bound chat id so a leaked secret cannot exfiltrate /status
  // to an attacker-controlled chat.
  const expectedChat = settings.telegramChatId?.trim();
  if (!expectedChat) {
    await sendTelegramReply(
      token,
      chatId,
      "Telegram commands are disabled until you save a Chat ID under Alerts.",
    );
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!timingSafeEqual(String(chatId), expectedChat)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cmd = (text.split(/\s+/)[0] ?? "").toLowerCase().replace(/@\S+$/, "");

  if (cmd === "/snooze") {
    const hours = parseTelegramSnoozeHours(text);
    await saveAlertSettingsForUser(userId, {
      ...settings,
      snoozeUntil: snoozeUntilFromHours(hours),
    });
    await sendTelegramReply(
      token,
      chatId,
      `Alerts snoozed for ${hours} hour${hours === 1 ? "" : "s"}. Freeze and leak alerts still fire.`,
    );
  } else if (cmd === "/vacation") {
    const days = parseTelegramVacationDays(text);
    await saveAlertSettingsForUser(userId, {
      ...settings,
      vacationUntil: vacationUntilFromDays(days),
    });
    await sendTelegramReply(
      token,
      chatId,
      `Vacation mode enabled for ${days} day${days === 1 ? "" : "s"}. Freeze and leak alerts still fire.`,
    );
  } else if (cmd === "/status") {
    const householdId = await getUserHouseholdId(userId);
    if (!householdId) {
      await sendTelegramReply(token, chatId, "No active household.");
    } else {
      const latest = await fetchLatestSensorValues(householdId);
      const query = telegramStatusQuery(text);
      const rows = filterRowsByLabel(latest, query);
      const lines = rows.slice(0, 6).map((row) => {
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
        lines.length
          ? lines.join("\n")
          : query
            ? `No sensors matching "${query}".`
            : "No readings yet.",
      );
    }
  } else if (cmd === "/help") {
    await sendTelegramReply(
      token,
      chatId,
      TELEGRAM_HELP,
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
