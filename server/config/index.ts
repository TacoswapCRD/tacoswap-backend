import { CorsOptions } from 'cors';

export interface Config {
    isProduction: boolean;
    logLevel: string;
    databaseUri: string;
    appKey: string;
    port: number;
    useSockets: boolean;
    siteUrl: string;

    web3: {
        infuraUrl: string;
        masterContractAddress: string;
        weth: string;
    };

    cors: CorsOptions;
    jwtOptions: {
        expiresIn: string;
    };

    bearerOptions: {
        bodyKey: string;
        queryKey: string;
        headerKey: string;
        reqKey: string;
    };

    rateLimitOptions: {
        windowMs: number;
        max: number;
        delayMs: number;
    };
}

const config: Config = {
    isProduction: process.env.NODE_ENV === 'production',
    logLevel: process.env.LOG_LEVEL || 'info', // 'error', 'warn', 'info', 'verbose', 'debug', 'silly'
    databaseUri: process.env.MONGODB_URI as string,
    appKey: process.env.APP_KEY as string,
    port: parseInt(process.env.PORT || '3000'),
    useSockets: !!process.env.USE_SOCKETS,
    siteUrl: process.env.SITE_URL as string,

    web3: {
        infuraUrl: process.env.INFURA_URL as string,
        masterContractAddress: process.env.MASTER_CONTRACT_ADDRESS as string,
        weth: process.env.WETH as string,
    },

    cors: {
        origin: (process.env.CORS || '').split(' ').map((host) => {
            return new RegExp(host);
        }),
        credentials: true,
        optionsSuccessStatus: 200,
    },

    jwtOptions: {
        expiresIn: '7d',
    },

    bearerOptions: {
        bodyKey: 'access_token',
        queryKey: 'access_token',
        headerKey: 'Bearer',
        reqKey: 'token',
    },

    rateLimitOptions: {
        // 1 minute
        windowMs: 1 * 60 * 1000,

        // 3- requests per windowMs
        max: 30,

        // disable delaying - full speed until the max limit is reached
        delayMs: 0,
    },
};

console.log('Started with configuration time:');
console.log(JSON.stringify(config, null, 2));

export default config;
