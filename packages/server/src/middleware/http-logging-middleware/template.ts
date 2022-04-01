import { getFormattedDate } from './get-formatted-date';
import { safeJSONStringify } from './safe-stringify';
import { Template } from './types';

export const requestResponseTemplate: Template = (req, res, ...logMessages): string => `
-----------------------------------------------
[${getFormattedDate()}] 

${req.method.toUpperCase()}

${req.originalUrl ?? req.url}

headers
${['referer'].forEach(h => console.log(safeJSONStringify({ [h]: req.headers?.[h] })))}

query
${safeJSONStringify(req.query ?? {})}

body
${safeJSONStringify(req.body ?? {})}

${res.statusCode}

${logMessages.join('\n')}
-----------------------------------------------
`;

