import type { RequestHandler } from 'express';
import { isGeneratorFunction } from '../guards/guards';

export interface Logger {
  (log: string): void;
}

function safeJSONStringify(o: Record<string, unknown>): string {
  try {
    return JSON.stringify(o, null, 4);
  } catch {
    return '';
  }
}

export function createLoggingMiddleware(...loggers: Logger[]): RequestHandler {
  return function * (req, res) {
    let timestamp = new Date();
    let formatted =
      [timestamp.getFullYear(),
      (timestamp.getMonth() + 1),
      timestamp.getDate()].join('-')
      +
      " " +
      [timestamp.getHours(),
      timestamp.getMinutes(),
      timestamp.getSeconds()].join(':');

    let method = req.method;
    let status = res.statusCode;

    let logMessage = `

-----------------------------------------------
[${formatted}] 

${method.toUpperCase()}

${req.originalUrl ?? req.url}

query
${safeJSONStringify(req.query ?? {})}

body
${safeJSONStringify(req.body ?? {})}

${status}
-----------------------------------------------

    `;

    for(let log of loggers) {
      if(isGeneratorFunction(log)) {
        yield log(logMessage);
        continue;
      }

      log(logMessage);
    }
  };
}
