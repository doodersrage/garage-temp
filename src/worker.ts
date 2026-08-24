import { handle } from "@astrojs/cloudflare/handler";
import { collectHistoryForAllUsers } from "./lib/collectHistory";
import {
  sendWeeklyDigestsForAllUsers,
  shouldSendWeeklyDigest,
} from "./lib/digestEmails";

export default {
  fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    return handle(request, env, ctx);
  },

  async scheduled(_controller: ScheduledController, _env: unknown, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        const result = await collectHistoryForAllUsers();
        if (result.errors.length > 0) {
          console.error("Scheduled history collection errors:", result.errors);
        }
        console.info(
          `Scheduled history collection finished: ${result.usersProcessed} user(s) processed`,
        );

        if (shouldSendWeeklyDigest()) {
          const digest = await sendWeeklyDigestsForAllUsers();
          if (digest.errors.length > 0) {
            console.error("Weekly digest errors:", digest.errors);
          }
          console.info(
            `Weekly digest finished: ${digest.sent} sent, ${digest.skipped} skipped`,
          );
        }
      })(),
    );
  },
};
