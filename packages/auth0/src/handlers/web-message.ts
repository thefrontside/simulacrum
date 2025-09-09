import type { RequestHandler } from "express";
import { assert } from "assert-ts";
import { encode } from "base64-url";
import type { QueryParams } from "../types.ts";
import { webMessage } from "../views/web-message.ts";

export const createWebMessageHandler = (): RequestHandler =>
  function (req, res) {
    assert(!!req?.session, "no session");

    let username = req.session.username;

    assert(!!username, `no username in authorise`);

    let { redirect_uri, state, nonce } = req.query as QueryParams;

    res.set("Content-Type", "text/html");

    let message = webMessage({
      code: encode(`${nonce}:${username}`),
      state,
      redirect_uri,
      nonce,
    });

    res.status(200).send(Buffer.from(message));
  };
