import type { RequestHandler } from 'express';
import { Logger } from './types';


export function createLoggingMiddleware(...loggers: Logger[]): RequestHandler {
  return function * (req, res) {
    for(let log of loggers) {
      log(req, res);
    }
  };
}
