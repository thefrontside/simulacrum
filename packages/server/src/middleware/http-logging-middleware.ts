import type { RequestHandler } from 'express';
import { isGeneratorFunction } from '../guards/guards';
import { getFormattedDate } from './get-formatted-date';
import { log } from './template';

export interface Logger {
  (log: string): void;
}

export function createLoggingMiddleware(...loggers: Logger[]): RequestHandler {
  return function * (req, res) {
    let date = getFormattedDate();
    let method = req.method;
    let status = res.statusCode;

    let logMessage = log({ date, method, req, status });

    for(let log of loggers) {
      if(isGeneratorFunction(log)) {
        yield log(logMessage);
        continue;
      }

      log(logMessage);
    }
  };
}
