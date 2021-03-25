import config from '@server/config';
import { joinUrl } from '@server/libs/join-url';
import logger from '@server/logger';
import { ApiHandlerVersioned, ExpressHandler, HttpMethod, Route } from '@server/typing/middlewares';
import bodyParserMiddleware from 'body-parser';
import corsMiddleware from 'cors';
import { Express, Request, Router } from 'express';
import bearerTokenMiddleware from 'express-bearer-token';
import rateLimitMiddleware from 'express-rate-limit';

import { morganMiddleware } from './morgan';
import { redirectToHttpsMiddleware } from './redirect-to-https';
import { staticFileMiddleware } from './static-files';

export const applyMiddlewares = (app: Express): void => {
    app.use(morganMiddleware);
    app.use(rateLimitMiddleware(config.rateLimitOptions));
    app.use(redirectToHttpsMiddleware);
    app.use(bodyParserMiddleware.json({ limit: '4mb' }));
    app.use(bodyParserMiddleware.urlencoded({ extended: false, limit: '4mb' }));
    app.use(bearerTokenMiddleware(config.bearerOptions));
    app.use(corsMiddleware(config.cors));
    app.options('*', corsMiddleware<Request>(config.cors));

    app.use(staticFileMiddleware);
};

export const applyRoutes = (prefix: string, routes: Route[], router: Router, apiVersion = 'v1'): void => {
    for (const route of routes) {
        const { method, path, handlers, rootPath }: Route = route;

        const versionedApiHanlers: ExpressHandler[] = handlers[apiVersion];

        if (!versionedApiHanlers) {
            return console.warn(`${path} not available in api ${apiVersion}`);
        }

        let url;

        if (path) {
            url = joinUrl('/api', apiVersion, prefix, path);
        } else if (rootPath) {
            url = rootPath;
        } else {
            throw new Error(`Neither 'path' not 'rootPath' defined for route`);
        }

        logger.debug(`Applying route "${method}" handler for ${url}`);

        // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        router[method](url, versionedApiHanlers as any);
    }
};
