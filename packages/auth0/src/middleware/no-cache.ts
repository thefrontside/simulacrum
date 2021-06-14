import type { RequestHandler } from 'express';

export const noCache: () => RequestHandler = () => (_, res, next) => {
  res.set("Pragma", "no-cache");
  res.set("Cache-Control", "no-cache, no-store");
  next();
};
