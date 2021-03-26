import logger from '@server/logger';
import schedule from 'node-schedule';
import { v4 } from 'uuid';

import { getPools } from './blockchain';

const updatePoolsDataJob = async () => {
    const jobId = v4();

    logger.debug(`Updating block data and pools job ${jobId} started at ${new Date()}`);
    await getPools(true, true);
    logger.debug(`Job ${jobId} finished at ${new Date()}`);
};

export const initScheduler = (): void => {
    schedule.scheduleJob('*/20 * * * * *', updatePoolsDataJob);
    logger.info(`Scheduler initialized`);
};
