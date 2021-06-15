import { HttpHandler } from '@simulacrum/server';
import { Auth0Options } from '../types';

export type Routes =
  | '/heartbeat'

export const createAuth0Handlers = ({

}: Auth0Options): Record<Routes, HttpHandler> => {
  return {
    ['/heartbeat']: function *(_, res) {
      res.status(200).json({ ok: true });
    }
  };
};

