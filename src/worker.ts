import * as Sentry from "@sentry/cloudflare";
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
import { runFeedUptimeForAllUsers } from "./lib/feedUptimeMonitor";
import { archiveOldReadings } from "./lib/archiveHistory";
import { runPlaybooksForAllUsers } from "./lib/alertPlaybookRunner";
import { sendPortfolioAlertsForAllUsers } from "./lib/portfolioAlerts";
import { sendFreezeDrillsForAllUsers } from "./lib/freezeDrillEmails";
import { checkAndNotifyStatusSubscribers } from "./lib/statusNotify";
import { isFullHourlyCronRun } from "./lib/cronSchedule";
import {
  collectHistoryStaleMessage,
  fetchLastSuccessfulCollectHistory,
  isCollectHistoryStale,
} from "./lib/cronHealth";

type WorkerEnv = Env & {
  SENTRY_DSN?: string;
  CF_VERSION_METADATA?: { id?: string; tag?: string; timestamp?: string };
};

function sentryOptions(env: WorkerEnv) {
  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn || dsn === "off") {
    return undefined;
  }

  return {
    dsn,
    environment: "production",
    release: env.CF_VERSION_METADATA?.id,
    tracesSampleRate: 0.1,
    // Cron + waitUntil work continues after the response; stream spans as they finish.
    traceLifecycle: "stream" as const,
  };
}

async function runCollectHistoryJob(): Promise<void> {
  const historyJobId = await startJobRun("collect-history");
  try {
    const result = await collectHistoryForAllUsers();
    if (result.errors.length > 0) {
      console.error("Scheduled history collection errors:", result.errors);
      await finishJobRun(historyJobId, "error", {
        householdsProcessed: result.householdsProcessed,
        usersProcessed: result.usersProcessed,
        errors: result.errors.slice(0, 20),
        warnings: result.warnings.slice(0, 20),
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
      if (result.warnings.length > 0) {
        console.warn(
          "Scheduled history collection soft-skips:",
          result.warnings.slice(0, 20),
        );
      }
      console.info(
        `Scheduled history collection finished: ${result.householdsProcessed} household(s), ${result.usersProcessed} member alert pass(es)`,
      );
      await finishJobRun(historyJobId, "success", {
        householdsProcessed: result.householdsProcessed,
        usersProcessed: result.usersProcessed,
        errors: [],
        warnings: result.warnings.slice(0, 20),
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
}

async function runHourlyMaintenanceJobs(env: WorkerEnv): Promise<void> {
  const lastHistoryPollAt = await fetchLastSuccessfulCollectHistory();
  if (isCollectHistoryStale(lastHistoryPollAt)) {
    await notifyOps(
      "ThermalTrace: collect-history overdue",
      formatJobFailureBody("collect-history", {
        message: collectHistoryStaleMessage(lastHistoryPollAt),
        lastSuccessAt: lastHistoryPollAt,
      }),
    );
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

        const feedUptimeJobId = await startJobRun("feed-uptime");
        try {
          const uptime = await runFeedUptimeForAllUsers();
          await finishJobRun(feedUptimeJobId, uptime.errors.length ? "error" : "success", {
            checked: uptime.checked,
            failed: uptime.failed,
            alertsSent: uptime.alertsSent,
            errors: uptime.errors.slice(0, 20),
          });
        } catch (error) {
          await finishJobRun(feedUptimeJobId, "error", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }

        if (shouldRunDailyRetention()) {
          const archiveJobId = await startJobRun("history-archive");
          try {
            const envWithR2 = env as { HISTORY_ARCHIVE?: R2Bucket };
            const archive = await archiveOldReadings({ r2: envWithR2.HISTORY_ARCHIVE });
            await finishJobRun(archiveJobId, archive.error ? "error" : "success", {
              archived: archive.archived,
              skipped: archive.skipped,
              error: archive.error,
            });
          } catch (error) {
            await finishJobRun(archiveJobId, "error", {
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        const playbookJobId = await startJobRun("alert-playbooks");
        try {
          const playbooks = await runPlaybooksForAllUsers();
          await finishJobRun(
            playbookJobId,
            playbooks.errors.length ? "error" : "success",
            playbooks,
          );
        } catch (error) {
          await finishJobRun(playbookJobId, "error", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }

        const portfolioJobId = await startJobRun("portfolio-alerts");
        try {
          const portfolio = await sendPortfolioAlertsForAllUsers();
          await finishJobRun(
            portfolioJobId,
            portfolio.errors.length ? "error" : "success",
            portfolio,
          );
        } catch (error) {
          await finishJobRun(portfolioJobId, "error", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }

        const freezeDrillJobId = await startJobRun("freeze-drill");
        try {
          const freezeDrill = await sendFreezeDrillsForAllUsers();
          await finishJobRun(
            freezeDrillJobId,
            freezeDrill.errors.length ? "error" : "success",
            freezeDrill,
          );
          if (freezeDrill.sent > 0) {
            console.info(
              `Freeze drill finished: ${freezeDrill.sent} sent, ${freezeDrill.skipped} skipped`,
            );
          }
        } catch (error) {
          await finishJobRun(freezeDrillJobId, "error", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }

        const statusNotifyJobId = await startJobRun("status-notify");
        try {
          const statusNotify = await checkAndNotifyStatusSubscribers();
          await finishJobRun(
            statusNotifyJobId,
            statusNotify.errors.length ? "error" : "success",
            statusNotify,
          );
        } catch (error) {
          await finishJobRun(statusNotifyJobId, "error", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
}

const worker = {
  fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
    // @astrojs/cloudflare handler Env typing differs from generated worker Env.
    return handle(request, env as never, ctx);
  },

  async scheduled(
    controller: ScheduledController,
    env: WorkerEnv,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(
      (async () => {
        await runCollectHistoryJob();
        if (!isFullHourlyCronRun(controller.cron)) {
          return;
        }
        await runHourlyMaintenanceJobs(env);
      })().catch((error) => {
        Sentry.captureException(error);
        throw error;
      }),
    );
  },
};

export default Sentry.withSentry(sentryOptions, worker);
