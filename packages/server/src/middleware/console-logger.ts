import type { Middleware } from 'src';

function getFormattedDate(): string {
  let timestamp = new Date();
  let date = [timestamp.getFullYear(),
      (timestamp.getMonth() + 1),
      timestamp.getDate()].join('-');

  let time = [
    timestamp.getHours(),
    timestamp.getMinutes(),
    timestamp.getSeconds()].join(':');

  return [date, time].join(' ');
}

function safeJSONStringify(o: Record<string, unknown>): string {
  try {
    return JSON.stringify(o, null, 4);
  } catch {
    return '';
  }
}

export const consoleLogger: Middleware = function *(req, res) {
  console.log(`-----------------------------------------------
[${getFormattedDate()}]

${req.method.toUpperCase()}

${req.originalUrl ?? req.url}

query
${safeJSONStringify(req.query ?? {})}

body
${safeJSONStringify(req.body ?? {})}

${res.statusCode}
-----------------------------------------------`);
};
