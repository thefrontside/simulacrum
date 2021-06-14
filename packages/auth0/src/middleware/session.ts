import type { RequestHandler } from 'express';
import cookieSession from "cookie-session";
const twentyFourHours = 24 * 60 * 60 * 1000;

export const createSession = (): RequestHandler => {
  return cookieSession({
    name: "session",
    keys: ["shhh"],
    secure: true,
    httpOnly: false,
    maxAge: twentyFourHours,
    sameSite: "none",
 });
};
