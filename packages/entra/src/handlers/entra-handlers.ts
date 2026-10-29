import { assert } from "assert-ts";
import { stringify } from "querystring";
import { encode } from "html-entities";
import { decodeJwt } from "jose";
import type { Request, RequestHandler, Response } from "express";
import type { ExtendedSimulationStore } from "../store/index.ts";
import type { EntraUser } from "../store/entities.ts";
import type { AuthorizeQuery, EntraConfiguration, ResponseMode } from "../types.ts";
import { epochTime } from "../auth/date.ts";
import { loginView } from "../views/login.ts";
import { createTokens } from "./token.ts";
import { createUserQuery, encodeAuthorizationCode } from "./utils.ts";
import { issuerFor, tenantParam } from "./openid-handlers.ts";

export type Routes = "/authorize" | "/login" | "/token" | "/logout" | "/userinfo" | "/heartbeat";

type LoggerArgs = Parameters<typeof console.dir>;

const createLogger = (debug: boolean) => ({
  log: (...args: LoggerArgs): void => {
    if (!debug) return;
    console.dir(...args);
  },
});

// A stable, fake session_state value; Entra returns one but its contents are opaque.
const SESSION_STATE = "00000000-0000-0000-0000-000000000000";

const parseAuthorizeQuery = (source: Record<string, unknown>): AuthorizeQuery => ({
  client_id: source.client_id as string,
  redirect_uri: source.redirect_uri as string,
  response_type: (source.response_type as string) ?? "code",
  response_mode: source.response_mode as ResponseMode | undefined,
  scope: (source.scope as string) ?? "openid profile email",
  state: source.state as string | undefined,
  nonce: source.nonce as string | undefined,
  code_challenge: source.code_challenge as string | undefined,
  code_challenge_method: source.code_challenge_method as string | undefined,
  prompt: source.prompt as string | undefined,
  login_hint: source.login_hint as string | undefined,
  domain_hint: source.domain_hint as string | undefined,
});

const defaultResponseMode = (query: AuthorizeQuery): ResponseMode => {
  if (query.response_mode) return query.response_mode;
  // Entra defaults to `query` for the code flow and `fragment` otherwise.
  return query.response_type === "code" ? "query" : "fragment";
};

const redirectWithCode = (res: Response, query: AuthorizeQuery, user: EntraUser): void => {
  let code = encodeAuthorizationCode({
    sub: user.id,
    oid: user.id,
    nonce: query.nonce,
    scope: query.scope,
    client_id: query.client_id,
    code_challenge: query.code_challenge,
    code_challenge_method: query.code_challenge_method,
    auth_time: epochTime(),
    iat: epochTime(),
  });

  let params: Record<string, string> = { code, session_state: SESSION_STATE };
  if (typeof query.state !== "undefined") params.state = query.state;

  let mode = defaultResponseMode(query);

  if (mode === "form_post") {
    res.set("Content-Type", "text/html");
    res.status(200).send(autoPostForm(query.redirect_uri, params));
    return;
  }

  res.redirect(302, appendParams(query.redirect_uri, mode, params));
};

const redirectWithError = (
  res: Response,
  query: AuthorizeQuery,
  error: string,
  description: string,
): void => {
  let params: Record<string, string> = { error, error_description: description };
  if (typeof query.state !== "undefined") params.state = query.state;
  let mode = defaultResponseMode(query);
  res.redirect(302, appendParams(query.redirect_uri, mode, params));
};

// Append the response params to the redirect_uri. `fragment` uses `#`; `query`
// uses `?` — unless the redirect_uri already carries a query string, in which
// case `&` keeps the URL well-formed instead of producing `...?a=1?code=...`.
const appendParams = (
  redirectUri: string,
  mode: ResponseMode,
  params: Record<string, string>,
): string => {
  let qs = stringify(params);
  if (mode === "fragment") return `${redirectUri}#${qs}`;
  let separator = redirectUri.includes("?") ? "&" : "?";
  return `${redirectUri}${separator}${qs}`;
};

const autoPostForm = (action: string, fields: Record<string, string>): string => {
  // Escape the action (redirect_uri) and every value. Beyond the obvious markup
  // safety, a legitimate `state`/`redirect_uri` containing `"`, `&`, or `<` would
  // otherwise break out of the attribute and corrupt the posted value, making the
  // developer's app reject the callback with a state mismatch.
  let inputs = Object.entries(fields)
    .map(([name, value]) => `<input type="hidden" name="${name}" value="${encode(value)}" />`)
    .join("\n");
  return /*html*/ `<html><head><title>Working...</title></head>
    <body onload="document.forms[0].submit()">
      <form method="post" action="${encode(action)}">
        ${inputs}
        <noscript><button type="submit">Continue</button></noscript>
      </form>
    </body></html>`;
};

const loginPath = (req: Request): string => `/${tenantParam(req)}/login`;

export const createEntraHandlers = (
  simulationStore: ExtendedSimulationStore,
  config: EntraConfiguration,
  debug: boolean,
): Record<Routes, RequestHandler> => {
  let logger = createLogger(debug);
  let userQuery = createUserQuery(simulationStore);

  return {
    ["/heartbeat"]: function (_req, res) {
      res.status(200).json({ ok: true });
    },

    ["/authorize"]: function (req, res) {
      logger.log({ "/authorize": { query: req.query, session: req.session } });
      let query = parseAuthorizeQuery(req.query as Record<string, unknown>);

      assert(!!query.client_id, "400::client_id is required");
      assert(!!query.redirect_uri, "400::redirect_uri is required");

      let sessionUser = req.session?.username as string | undefined;

      if (sessionUser) {
        let user = userQuery(
          (u) =>
            u.email?.toLowerCase() === sessionUser.toLowerCase() ||
            u.preferredUsername?.toLowerCase() === sessionUser.toLowerCase(),
        );
        if (user) {
          redirectWithCode(res, query, user);
          return;
        }
      }

      if (query.prompt === "none") {
        // silent auth with no established session -> spec-compliant error redirect
        redirectWithError(res, query, "login_required", "The user must sign in.");
        return;
      }

      res.set("Content-Type", "text/html");
      res.status(200).send(loginView({ actionUrl: loginPath(req), query, loginFailed: false }));
    },

    ["/login"]: function (req, res) {
      logger.log({ "/login": { body: { ...req.body, password: "***" } } });
      let query = parseAuthorizeQuery(req.body as Record<string, unknown>);
      let { username, password } = req.body as { username?: string; password?: string };

      assert(!!username, "400::username is required");
      assert(!!query.redirect_uri, "400::redirect_uri is required");

      let user = userQuery(
        (u) =>
          (u.email?.toLowerCase() === username!.toLowerCase() ||
            u.preferredUsername?.toLowerCase() === username!.toLowerCase()) &&
          u.password === password,
      );

      if (!user) {
        res.set("Content-Type", "text/html");
        res.status(401).send(loginView({ actionUrl: loginPath(req), query, loginFailed: true }));
        return;
      }

      if (req.session) {
        req.session.username = username;
      }

      redirectWithCode(res, query, user);
    },

    ["/token"]: async function (req, res, next) {
      logger.log({ "/token": { body: { ...req.body, client_secret: "***" } } });
      try {
        let tokens = await createTokens({
          simulationStore,
          config,
          issuer: issuerFor(req),
          tenant: tenantParam(req),
          body: req.body ?? {},
        });
        res.status(200).json(tokens);
      } catch (error) {
        next(error);
      }
    },

    ["/userinfo"]: function (req, res) {
      let token: string | undefined;
      if (req.headers.authorization) {
        token = req.headers.authorization.split(" ")?.[1];
      } else {
        token = req.query?.access_token as string | undefined;
      }

      assert(!!token, "401::no bearer token or access_token");
      let { oid, sub } = decodeJwt(token);
      let subject = (oid as string) ?? (sub as string);

      let user = userQuery((u) => u.id === subject);
      assert(!!user, "404::user not found");

      res.status(200).json({
        sub: user.id,
        oid: user.id,
        name: user.name,
        given_name: user.name.split(" ")[0],
        family_name: user.name.split(" ").slice(1).join(" ") || user.name,
        preferred_username: user.preferredUsername,
        email: user.email,
      });
    },

    ["/logout"]: function (req, res) {
      req.session = null;

      let returnTo =
        (req.query.post_logout_redirect_uri as string | undefined) ??
        (req.headers.referer as string | undefined);

      if (!returnTo) {
        res.status(200).send("Logged out");
        return;
      }

      res.redirect(302, returnTo);
    },
  };
};
