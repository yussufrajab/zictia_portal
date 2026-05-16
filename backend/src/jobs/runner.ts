import { processPendingNotifications } from "./notificationWorker";
import { logger } from "../utils/logger";

const jobName = process.argv[2];

async function run() {
  logger.info("Job runner started", { job: jobName });

  switch (jobName) {
    case "notifications":
      await processPendingNotifications();
      break;
    default:
      logger.error("Unknown job", { job: jobName });
      process.exit(1);
  }

  logger.info("Job runner completed", { job: jobName });
  process.exit(0);
}

run().catch((err) => {
  logger.error("Job runner error", { error: err.message });
  process.exit(1);
});
