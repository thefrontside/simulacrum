import { Middleware } from '@simulacrum/server';
import cookieSession from "cookie-session";
const twentyFourHours = 24 * 60 * 60 * 1000;

export const createSession = (): Middleware => {
  return cookieSession({
    name: "session",
    keys: ["shhh"],
    secure: true,
    httpOnly: false,
    maxAge: twentyFourHours,
    sameSite: "none",
 });
};
