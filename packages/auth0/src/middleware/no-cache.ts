import { Middleware } from '@simulacrum/server';

export const noCache: () => Middleware = () => (_, res, next) => {
  res.set("Pragma", "no-cache");
  res.set("Cache-Control", "no-cache, no-store");
  next();
};
