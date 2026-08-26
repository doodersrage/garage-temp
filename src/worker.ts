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
import { formatJobFailureBody, notifyOps } from "./lib/opsNotify";

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
            await finishJobRun(historyJobId, "error", {
              householdsProcessed: result.householdsProcessed,
              usersProcessed: result.usersProcessed,
              errors: result.errors.slice(0, 20),
            });
            await notifyOps(
              "Garage Temp job failed: collect-history",
              formatJobFailureBody("collect-history", {
                householdsProcessed: result.householdsProcessed,
                usersProcessed: result.usersProcessed,
                errors: result.errors.slice(0, 20),
              }),
            );
          } else {
            console.info(
              `Scheduled history collection finished: ${result.householdsProcessed} household(s), ${result.usersProcessed} member alert pass(es)`,
            );
            await finishJobRun(historyJobId, "success", {
              householdsProcessed: result.householdsProcessed,
              usersProcessed: result.usersProcessed,
              errors: [],
            });
          }
        } catch (error) {
          const details = {
            message: error instanceof Error ? error.message : "Unknown error",
          };
          await finishJobRun(historyJobId, "error", details);
          await notifyOps(
            "Garage Temp job failed: collect-history",
            formatJobFailureBody("collect-history", details),
          );
          throw error;
        }

        if (shouldSendWeeklyDigest()) {
          const digestJobId = await startJobRun("weekly-digest");
          try {
            const digest = await sendWeeklyDigestsForAllUsers();
            if (digest.errors.length > 0) {
              console.error("Weekly digest errors:", digest.errors);
              await finishJobRun(digestJobId, "error", {
                sent: digest.sent,
                skipped: digest.skipped,
                errors: digest.errors.slice(0, 20),
              });
              await notifyOps(
                "Garage Temp job failed: weekly-digest",
                formatJobFailureBody("weekly-digest", {
                  sent: digest.sent,
                  skipped: digest.skipped,
                  errors: digest.errors.slice(0, 20),
                }),
              );
            } else {
              console.info(
                `Weekly digest finished: ${digest.sent} sent, ${digest.skipped} skipped`,
              );
              await finishJobRun(digestJobId, "success", {
                sent: digest.sent,
                skipped: digest.skipped,
                errors: [],
              });
            }
          } catch (error) {
            const details = {
              message: error instanceof Error ? error.message : "Unknown error",
            };
            await finishJobRun(digestJobId, "error", details);
            await notifyOps(
              "Garage Temp job failed: weekly-digest",
              formatJobFailureBody("weekly-digest", details),
            );
          }
        }

        if (shouldRunDailyRetention()) {
          const retentionJobId = await startJobRun("sensor-retention");
          try {
            const retention = await runSensorReadingRetention();
            if (retention.error) {
              await finishJobRun(retentionJobId, "error", {
                rolledUp: retention.rolledUp,
                deleted: retention.deleted,
                error: retention.error,
              });
              await notifyOps(
                "Garage Temp job failed: sensor-retention",
                formatJobFailureBody("sensor-retention", {
                  message: retention.error,
                  rolledUp: retention.rolledUp,
                  deleted: retention.deleted,
                }),
              );
            } else {
              await finishJobRun(retentionJobId, "success", {
                rolledUp: retention.rolledUp,
                deleted: retention.deleted,
                error: null,
              });
              console.info(
                `Retention finished: rolled up ${retention.rolledUp}, deleted ${retention.deleted}`,
              );
            }
          } catch (error) {
            const details = {
              message: error instanceof Error ? error.message : "Unknown error",
            };
            await finishJobRun(retentionJobId, "error", details);
            await notifyOps(
              "Garage Temp job failed: sensor-retention",
              formatJobFailureBody("sensor-retention", details),
            );
          }
        }
      })(),
    );
  },
};
