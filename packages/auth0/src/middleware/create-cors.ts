import type { RequestHandler } from 'express';
import cors from "cors";

export const createCors = (): RequestHandler =>
  cors({
    origin: (origin, cb) => {
      if (typeof origin === "string") {
        return cb(null, [origin]);
      }

      cb(null, "*");
    },
    credentials: true,
  });
