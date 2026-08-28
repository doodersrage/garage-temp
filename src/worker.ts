import { handle } from "@astrojs/cloudflare/handler";
import { collectHistoryForAllUsers } from "./lib/collectHistory";
import {
  sendWeeklyDigestsForAllUsers,
  shouldSendWeeklyDigest,
} from "./lib/digestEmails";
import {
  sendMonthlyReportsForAllUsers,
  shouldSendMonthlyReport,
} from "./lib/monthlyReportEmails";
import {
  sendQuarterlyReportsForAllUsers,
  shouldSendQuarterlyReport,
} from "./lib/quarterlyReportEmails";
import { sendTrialRemindersForAllUsers, trialJobShouldFail } from "./lib/trialEmails";
import { dripJobShouldFail, sendDripEmailsForAllUsers } from "./lib/dripEmails";
import {
  finishJobRun,
  runSensorReadingRetention,
  shouldRunDailyRetention,
  startJobRun,
} from "./lib/jobRuns";
import { formatJobFailureBody, notifyOps } from "./lib/opsNotify";
import { collectFreezeMapSnapshots } from "./lib/freezeMap";

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // @astrojs/cloudflare handler Env typing differs from generated worker Env.
    return handle(request, env as never, ctx);
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
              "ThermalTrace job failed: collect-history",
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
            "ThermalTrace job failed: collect-history",
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
                "ThermalTrace job failed: weekly-digest",
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
              "ThermalTrace job failed: weekly-digest",
              formatJobFailureBody("weekly-digest", details),
            );
          }
        }

        if (shouldSendMonthlyReport()) {
          const monthlyJobId = await startJobRun("monthly-report");
          try {
            const monthly = await sendMonthlyReportsForAllUsers();
            if (monthly.errors.length > 0) {
              await finishJobRun(monthlyJobId, "error", {
                sent: monthly.sent,
                skipped: monthly.skipped,
                errors: monthly.errors.slice(0, 20),
              });
            } else {
              await finishJobRun(monthlyJobId, "success", {
                sent: monthly.sent,
                skipped: monthly.skipped,
                errors: [],
              });
              console.info(
                `Monthly report finished: ${monthly.sent} sent, ${monthly.skipped} skipped`,
              );
            }
          } catch (error) {
            const details = {
              message: error instanceof Error ? error.message : "Unknown error",
            };
            await finishJobRun(monthlyJobId, "error", details);
          }
        }

        if (shouldSendQuarterlyReport()) {
          const quarterlyJobId = await startJobRun("quarterly-report");
          try {
            const quarterly = await sendQuarterlyReportsForAllUsers();
            if (quarterly.errors.length > 0) {
              await finishJobRun(quarterlyJobId, "error", {
                sent: quarterly.sent,
                skipped: quarterly.skipped,
                errors: quarterly.errors.slice(0, 20),
              });
            } else {
              await finishJobRun(quarterlyJobId, "success", {
                sent: quarterly.sent,
                skipped: quarterly.skipped,
                errors: [],
              });
              console.info(
                `Quarterly report finished: ${quarterly.sent} sent, ${quarterly.skipped} skipped`,
              );
            }
          } catch (error) {
            const details = {
              message: error instanceof Error ? error.message : "Unknown error",
            };
            await finishJobRun(quarterlyJobId, "error", details);
          }
        }

        const trialJobId = await startJobRun("trial-reminders");
        try {
          const trial = await sendTrialRemindersForAllUsers();
          const failed = trialJobShouldFail(trial.errors);
          await finishJobRun(trialJobId, failed ? "error" : "success", {
            sent: trial.sent,
            skipped: trial.skipped,
            restricted: trial.restricted,
            errors: trial.errors.slice(0, 20),
          });
        } catch (error) {
          await finishJobRun(trialJobId, "error", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }

        const dripJobId = await startJobRun("drip-emails");
        try {
          const drip = await sendDripEmailsForAllUsers();
          const failed = dripJobShouldFail(drip.errors);
          await finishJobRun(dripJobId, failed ? "error" : "success", {
            sent: drip.sent,
            skipped: drip.skipped,
            restricted: drip.restricted,
            errors: drip.errors.slice(0, 20),
            ...(drip.restricted > 0
              ? {
                  hint: "MAILER binding blocked some recipients. Enable Email Sending for your from-domain and keep send_email unrestricted in wrangler.jsonc.",
                }
              : {}),
          });
          if (failed) {
            await notifyOps(
              "ThermalTrace job failed: drip-emails",
              formatJobFailureBody("drip-emails", {
                message: "Hard drip email failures",
                errors: drip.errors.slice(0, 10),
              }),
            );
          }
        } catch (error) {
          await finishJobRun(dripJobId, "error", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
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
                "ThermalTrace job failed: sensor-retention",
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
              "ThermalTrace job failed: sensor-retention",
              formatJobFailureBody("sensor-retention", details),
            );
          }
        }

        const freezeMapJobId = await startJobRun("freeze-map");
        try {
          const freezeMap = await collectFreezeMapSnapshots();
          if (freezeMap.error) {
            await finishJobRun(freezeMapJobId, "error", {
              cities: freezeMap.cities,
              error: freezeMap.error,
            });
            await notifyOps(
              "ThermalTrace job failed: freeze-map",
              formatJobFailureBody("freeze-map", {
                message: freezeMap.error,
                cities: freezeMap.cities,
              }),
            );
          } else {
            await finishJobRun(freezeMapJobId, "success", {
              cities: freezeMap.cities,
              error: null,
            });
            console.info(`Freeze map finished: ${freezeMap.cities} city aggregate(s)`);
          }
        } catch (error) {
          const details = {
            message: error instanceof Error ? error.message : "Unknown error",
          };
          await finishJobRun(freezeMapJobId, "error", details);
          await notifyOps(
            "ThermalTrace job failed: freeze-map",
            formatJobFailureBody("freeze-map", details),
          );
        }
      })(),
    );
  },
};
