import { HttpHandler } from '@simulacrum/server';
import { Options, ResponseModes } from '../types';
import { createAuthorizeHandlers } from './authorize';

export type Routes =
  | '/heartbeat'
  | '/authorize'
  | '/login'


export const createAuth0Handlers = (options: Options): Record<Routes, HttpHandler> => {
  let { loginRedirect } = createAuthorizeHandlers(options);

  return {
    ['/heartbeat']: function *(_, res) {
      res.status(200).json({ ok: true });
    },

    ['/authorize']: function *(req, res) {
      let responseMode = req.query.response_mode as ResponseModes;

      switch(responseMode) {
        case 'query':
          yield loginRedirect(req, res);
          break;
        default:
          throw new Error(`unknown response_mode ${responseMode}`);
      }
    },

    // TODO: fleshed out in next PR
    ['/login']: function* (_, res) {
      res.status(200).send('ok');
    },
  };
};

