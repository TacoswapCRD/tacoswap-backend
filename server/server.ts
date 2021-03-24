require('express-async-errors');

import { once } from 'events';
import http from 'http';

import config from '@server/config';
import { applyErrorHandlers } from '@server/errors';
import logger from '@server/logger';
import { applyMiddlewares, applyRoutes } from '@server/middlewares';
import blockchainRoutes from '@server/routes/blockchain/routes';
import { initScheduler } from '@server/services/scheduler';
import socket from '@server/websockets';
import express, { Express } from 'express';

export const app = express();

export const runApp = async (): Promise<Express> => {
    app.disable('x-powered-by');
    app.enable('trust proxy');

    applyMiddlewares(app);

    applyRoutes('', blockchainRoutes, app);

    applyErrorHandlers(app);

    const server = new http.Server(app);

    if (config.useSockets) {
        socket.initialize(server);
    }

    const listener = server.listen(config.port);

    await once(listener, 'listening');
    logger.info('Server running on the port ' + config.port);

    initScheduler();

    return app;
};
