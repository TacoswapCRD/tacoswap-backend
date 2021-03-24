import { getPoolsCached } from '@server/services/blockchain';
import { Pool } from '@server/typing/pool';

export const getPools = async (): Promise<Pool[]> => {
    return getPoolsCached();
};
