import { Route } from '@server/typing/middlewares';
import { Request, Response } from 'express';

import { getPools } from './blockchain.controller';

export default [
    {
        rootPath: '/pools',
        method: 'get',
        handlers: {
            v1: [
                async (req: Request, res: Response) => {
                    const result = await getPools();
                    res.status(200).send(result);
                },
            ],
        },
    },
] as Route[];
