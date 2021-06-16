import { HttpHandler } from '@simulacrum/server';
import { Options } from '../types';
import { createAuthorizeHandlers } from './authorize';


export type Routes =
  | '/heartbeat'
  | '/authorize'
  | '/login'

export const createAuth0Handlers = (options: Options): Record<Routes, HttpHandler> => {
  let { webMessageResponse, loginRedirect } = createAuthorizeHandlers(options);

  return {
    ['/heartbeat']: function *(_, res) {
      res.status(200).json({ ok: true });
    },
    ['/authorize']: function *(req, res) {
      if (req.query.response_mode === 'web_message') {
        yield webMessageResponse(req, res);
      } else {
        yield loginRedirect(req, res);
      }
    },
    ['/login']: function *(_, res) {
      res.status(200).send('Not implemented.....yet');
    }
  };
};

