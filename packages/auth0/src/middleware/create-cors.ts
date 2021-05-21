import { Middleware } from '@simulacrum/server';
import cors from "cors";

export const createCors = (): Middleware =>
  cors({
    origin: (origin, cb) => {
      if (typeof origin === "string") {
        return cb(null, [origin]);
      }

      cb(null, "*");
    },
    credentials: true,
  });
