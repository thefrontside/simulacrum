import { HttpHandler } from '@simulacrum/server';

export type Routes =
  | '/heartbeat'

export const createAuth0Handlers = (): Record<Routes, HttpHandler> => {
  return {
    ['/heartbeat']: function *(_, res) {
      res.status(200).json({ ok: true });
    }
  };
};

