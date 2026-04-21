const cron = require('node-cron');
const workflows = require('./syncWorkflows');

const timezone = process.env.SCHEDULER_TIMEZONE || 'Asia/Kolkata';
const scheduledTasks = [];

const runSafely = (name, task) => async () => {
  try {
    console.log(`[scheduler] starting ${name}`);
    await task();
    console.log(`[scheduler] finished ${name}`);
  } catch (error) {
    console.error(`[scheduler] ${name} failed:`, error);
  }
};

const schedule = (expression, name, task) => {
  const scheduled = cron.schedule(expression, runSafely(name, task), {
    scheduled: true,
    timezone
  });
  scheduledTasks.push({ name, expression, scheduled });
};

const startScheduler = () => {
  if (process.env.ENABLE_SCHEDULER !== 'true') {
    console.log('[scheduler] disabled. Set ENABLE_SCHEDULER=true to enable cron jobs.');
    return scheduledTasks;
  }

  schedule('7 * * * *', 'hourly:refresh-top-active-deals', () => workflows.refreshTopActiveDeals(500));
  schedule('17 * * * *', 'hourly:validate-homepage-items', workflows.validateHomepageItems);
  schedule('27 * * * *', 'hourly:expire-stale-deals', workflows.expireStaleDeals);

  schedule('13 */6 * * *', 'six-hour:category-delta-sync', async () => {
    for (const category of workflows.TARGET_CATEGORIES) {
      await workflows.runFlipkartCategoryDeltaSync(category);
    }
  });
  schedule('43 */6 * * *', 'six-hour:refresh-trending-categories', workflows.refreshTrendingCategories);

  schedule('5 2 * * *', 'daily:full-sync-target-categories', workflows.runDailyFullSync);
  schedule('35 3 * * *', 'daily:rebuild-rankings', workflows.rebuildRankings);
  schedule('5 4 * * *', 'daily:remove-dead-products', workflows.removeDeadProducts);
  schedule('25 4 * * *', 'daily:generate-todays-best-deals', workflows.generateTodaysBestDeals);

  schedule('15 5 * * 0', 'weekly:archive-expired-deals', workflows.archiveExpiredDeals);
  schedule('45 5 * * 0', 'weekly:rebuild-derived-statistics', workflows.rebuildDerivedStatistics);
  schedule('15 6 * * 0', 'weekly:compute-evergreen-products', workflows.computeEvergreenProducts);

  console.log(`[scheduler] enabled with ${scheduledTasks.length} jobs in ${timezone}`);
  return scheduledTasks;
};

const stopScheduler = () => {
  for (const task of scheduledTasks) {
    task.scheduled.stop();
  }
};

module.exports = {
  startScheduler,
  stopScheduler
};
