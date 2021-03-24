import { NextFunction, Request, Response } from 'express';

export const redirectToHttpsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    if (process.env.REDIRECT_TO_HTTPS) {
        if (req.headers['x-forwarded-proto'] !== 'https') {
            res.redirect(301, 'https://' + req.hostname + req.originalUrl);

            return;
        }
    }

    next();
};
