import { Request } from 'express';
import { safeJSONStringify } from './safe-stringify';

export const template = ({ date, req, res }: {date: string; method: string; req: Request; status: number; }): string => `
-----------------------------------------------
[${date}] 

${req.method.toUpperCase()}

${req.originalUrl ?? req.url}

query
${safeJSONStringify(req.query ?? {})}

body
${safeJSONStringify(req.body ?? {})}

${res.statusCode}
-----------------------------------------------
`;
