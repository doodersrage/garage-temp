import { handle } from "@astrojs/cloudflare/handler";
import { collectHistoryForAllUsers } from "./lib/collectHistory";
import {
  sendWeeklyDigestsForAllUsers,
  shouldSendWeeklyDigest,
} from "./lib/digestEmails";
import {
  finishJobRun,
  runSensorReadingRetention,
  shouldRunDailyRetention,
  startJobRun,
} from "./lib/jobRuns";

export default {
  fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    return handle(request, env, ctx);
  },

  async scheduled(_controller: ScheduledController, _env: unknown, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        const historyJobId = await startJobRun("collect-history");
        try {
          const result = await collectHistoryForAllUsers();
          if (result.errors.length > 0) {
            console.error("Scheduled history collection errors:", result.errors);
          }
          console.info(
            `Scheduled history collection finished: ${result.householdsProcessed} household(s), ${result.usersProcessed} member alert pass(es)`,
          );
          await finishJobRun(historyJobId, result.errors.length ? "error" : "success", {
            householdsProcessed: result.householdsProcessed,
            usersProcessed: result.usersProcessed,
            errors: result.errors.slice(0, 20),
          });
        } catch (error) {
          await finishJobRun(historyJobId, "error", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
          throw error;
        }

        if (shouldSendWeeklyDigest()) {
          const digestJobId = await startJobRun("weekly-digest");
          try {
            const digest = await sendWeeklyDigestsForAllUsers();
            if (digest.errors.length > 0) {
              console.error("Weekly digest errors:", digest.errors);
            }
            console.info(
              `Weekly digest finished: ${digest.sent} sent, ${digest.skipped} skipped`,
            );
            await finishJobRun(digestJobId, digest.errors.length ? "error" : "success", {
              sent: digest.sent,
              skipped: digest.skipped,
              errors: digest.errors.slice(0, 20),
            });
          } catch (error) {
            await finishJobRun(digestJobId, "error", {
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        if (shouldRunDailyRetention()) {
          const retentionJobId = await startJobRun("sensor-retention");
          try {
            const retention = await runSensorReadingRetention();
            await finishJobRun(
              retentionJobId,
              retention.error ? "error" : "success",
              {
                rolledUp: retention.rolledUp,
                deleted: retention.deleted,
                error: retention.error,
              },
            );
            console.info(
              `Retention finished: rolled up ${retention.rolledUp}, deleted ${retention.deleted}`,
            );
          } catch (error) {
            await finishJobRun(retentionJobId, "error", {
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      })(),
    );
  },
};
