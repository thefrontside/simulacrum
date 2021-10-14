import { getFormattedDate } from './get-formatted-date';
import { safeJSONStringify } from './safe-stringify';
import { Template } from './types';

export const requestResponseTemplate: Template = (req, res): string => `
-----------------------------------------------
[${getFormattedDate()}] 

${req.method.toUpperCase()}

${req.originalUrl ?? req.url}

query
${safeJSONStringify(req.query ?? {})}

body
${safeJSONStringify(req.body ?? {})}

${res.statusCode}
-----------------------------------------------
`;

