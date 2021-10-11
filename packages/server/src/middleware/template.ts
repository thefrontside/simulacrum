import { Request } from 'express';
import { safeJSONStringify } from './safe-stringify';

export const log = ({ date, method, req, status }: {date: string; method: string; req: Request; status: number; }): string => `
-----------------------------------------------
[${date}] 

${method.toUpperCase()}

${req.originalUrl ?? req.url}

query
${safeJSONStringify(req.query ?? {})}

body
${safeJSONStringify(req.body ?? {})}

${status}
-----------------------------------------------
`;
