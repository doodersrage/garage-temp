import type { AlertChannelName, AlertSettings } from "./alerts";
import type { AlertPlaybookStep } from "./alertPlaybooks";
import { listRecentAlertEvents, type AlertEventRow } from "./alertEvents";
import { getAlertSettingsForUser, notifyUser, saveAlertSettingsForUser } from "./notify";
import { createAdminClient } from "./supabase";
import { listAllHouseholdOwnerUserIds } from "./households";

type PlaybookFiredMap = Record<string, string>;

function playbookKey(eventId: number, stepId: string): string {
  return `${eventId}:${stepId}`;
}

function stepMatchesEvent(step: AlertPlaybookStep, event: AlertEventRow): boolean {
  if (step.kinds.length === 0) return true;
  return step.kinds.includes(event.kind);
}

function stepDue(step: AlertPlaybookStep, event: AlertEventRow, now: number): boolean {
  const created = Date.parse(event.created_at);
  if (Number.isNaN(created)) return false;
  return now - created >= step.afterMinutes * 60 * 1000;
}

export async function runPlaybooksForUser(
  userId: string,
  email: string | null | undefined,
  settings: AlertSettings,
): Promise<number> {
  if (!settings.enabled || settings.alertPlaybooks.length === 0) return 0;

  const events = await listRecentAlertEvents(userId, 30);
  const candidates = events.filter(
    (e) => e.channels_sent.length > 0 && e.kind !== "playbook",
  );

  const fired = { ...(settings.playbookFired ?? {}) } as PlaybookFiredMap;
  const now = Date.now();
  let executed = 0;

  for (const event of candidates) {
    for (const step of settings.alertPlaybooks) {
      if (step.ifUnacked && event.acknowledged_at) continue;
      if (!stepMatchesEvent(step, event)) continue;
      if (!stepDue(step, event, now)) continue;

      const key = playbookKey(event.id, step.id);
      if (fired[key]) continue;

      await notifyUser(
        userId,
        email,
        settings,
        {
          title: step.name || `Playbook: ${event.title}`,
          body: event.body,
          kind: "generic",
        },
        { channelFilter: step.channels },
      );

      fired[key] = new Date().toISOString();
      executed += 1;
    }
  }

  if (executed > 0) {
    settings.playbookFired = fired;
    await saveAlertSettingsForUser(userId, settings);
  }

  return executed;
}

export async function runPlaybooksForAllUsers(): Promise<{
  users: number;
  stepsExecuted: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let stepsExecuted = 0;
  const userIds = await listAllHouseholdOwnerUserIds();
  const admin = createAdminClient();

  for (const userId of userIds) {
    try {
      const { data } = await admin.auth.admin.getUserById(userId);
      const email = data.user?.email ?? null;
      const settings = await getAlertSettingsForUser(
        userId,
        data.user?.user_metadata as Record<string, unknown>,
      );
      stepsExecuted += await runPlaybooksForUser(userId, email, settings);
    } catch (err) {
      errors.push(
        `${userId}: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }

  return { users: userIds.length, stepsExecuted, errors };
}
