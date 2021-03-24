import morgan from 'morgan';

export const morganMiddleware = morgan(':method :url :status :res[content-length] - :response-time ms', {});
