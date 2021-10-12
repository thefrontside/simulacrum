import { Operation } from 'effection';
import type { RequestHandler } from 'express';
import { getFormattedDate } from './get-formatted-date';
import { template } from './template';

export interface Logger {
  (request: Request, repsonse: Response, ...logs: string[]): Operation<void>;
}

export function createLoggingMiddleware(...loggers: Logger[]): RequestHandler {
  return function * (req, res) {
    let date = getFormattedDate();

    let logMessage = template({ date, req, res });

    for(let log of loggers) {
      log(logMessage, req, res);
    }
  };
}
