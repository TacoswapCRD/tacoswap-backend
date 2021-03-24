import logger from '@server/logger';
import schedule from 'node-schedule';

import { getPools } from './blockchain';

const updatePoolsDataJob = async () => {
    logger.debug('Updating block data and pools');
    await getPools(true, true);
};

export const initScheduler = (): void => {
    schedule.scheduleJob('*/10 * * * * *', updatePoolsDataJob);
    logger.info(`Scheduler initialized`);
};
