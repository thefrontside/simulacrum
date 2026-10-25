import type { ExtendedSimulationStore } from "../store/index.ts";
import type { Request, RequestHandler } from "express";
import type { Auth0Configuration, QueryParams, ResponseModes } from "../types.ts";
import { createLoginRedirectHandler } from "./login-redirect.ts";
import { createWebMessageHandler } from "./web-message.ts";
import { loginView } from "../views/login.ts";
import { AccessDeniedError, createTokens } from "./oauth-handlers.ts";
import { createActionsRunner } from "../actions/actions-runner.ts";
import { assert } from "assert-ts";
import { stringify } from "querystring";
import { encode } from "base64-url";
import { userNamePasswordForm } from "../views/username-password.ts";
import { decodeJwt as decodeToken } from "jose";
import { createPersonQuery } from "./utils.ts";
import { faker } from "@faker-js/faker";
import { auth0UserSchema } from "../store/entities.ts";

export type Routes =
  | "/heartbeat"
  | "/authorize"
  | "/login"
  | "/usernamepassword/login"
  | "/dbconnections/signup"
  | "/login/callback"
  | "/oauth/token"
  | "/v2/logout"
  | "/userinfo"
  | "/passwordless/start";

export type AuthSession = { username: string; nonce: string };

type LoggerArgs = Parameters<typeof console.dir>;

const createLogger = (debug: boolean) => ({
  log: (...args: LoggerArgs): void => {
    if (!debug) {
      return;
    }

    console.dir(...args);
  },
});

export const createAuth0Handlers = (
  simulationStore: ExtendedSimulationStore,
  serviceURL: (request: Request) => string,
  options: Auth0Configuration,
  debug: boolean,
): Record<Routes, RequestHandler> => {
  let { audience, scope, clientID, rulesDirectory } = options;
  let actionsRunner = createActionsRunner(options.actions);
  let personQuery = createPersonQuery(simulationStore);

  let authorizeHandlers: Record<ResponseModes, RequestHandler> = {
    query: createLoginRedirectHandler(options),
    web_message: createWebMessageHandler(),
  };

  let logger = createLogger(debug);

  return {
    ["/heartbeat"]: function (_, res) {
      res.status(200).json({ ok: true });
    },

    ["/authorize"]: function (req, res, next) {
      logger.log({
        "/authorize": {
          body: req.body,
          query: req.query,
          session: req.session,
        },
      });
      let currentUser = req.query.currentUser as string | undefined;

      assert(!!req.session, "no session");

      // Auth0 shows an authorization code login's Actions the /authorize query, not /oauth/token's
      let nonce = req.query.nonce;
      if (typeof nonce === "string" && nonce) {
        simulationStore.store.dispatch(
          simulationStore.actions.batchUpdater([
            simulationStore.schema.sessions.patch({
              [nonce]: { nonce, authorizeQuery: req.query as Record<string, unknown> },
            }),
          ]),
        );
      }

      if (currentUser) {
        // the request is a silent login.
        // We fake an existing login by
        // adding the user to the session
        req.session.username = currentUser;
      }

      let responseMode = (req.query.response_mode ?? "query") as ResponseModes;

      assert(
        ["query", "web_message"].includes(responseMode),
        `unknown response_mode ${responseMode}`,
      );

      let handler = authorizeHandlers[responseMode];

      handler(req, res, next);
    },

    ["/login"]: function (req, res) {
      logger.log({ "/login": { body: req.body, query: req.query } });
      let query = req.query as QueryParams;
      let responseClientId = query.client_id ?? clientID;
      let responseAudience = query.audience ?? audience;
      assert(!!responseClientId, `no clientID assigned`);

      let signup = !options.disableSignup && query.screen_hint === "signup";
      let switchModeQuery = new URLSearchParams(req.query as Record<string, string>);
      if (signup) switchModeQuery.delete("screen_hint");
      else switchModeQuery.set("screen_hint", "signup");

      let html = loginView({
        domain: new URL(serviceURL(req)).host,
        scope,
        redirectUri: query.redirect_uri,
        clientID: responseClientId,
        audience: responseAudience,
        loginFailed: false,
        signup,
        loginHint: query.login_hint,
        ...(!options.disableSignup && { switchModeUrl: `/login?${switchModeQuery}` }),
      });

      res.set("Content-Type", "text/html");

      res.status(200).send(Buffer.from(html));
    },

    ["/usernamepassword/login"]: function (req, res) {
      logger.log({
        "/usernamepassword/login": { body: req.body, query: req.query },
      });
      let { username, nonce, password } = req.body;

      assert(!!username, "no username in /usernamepassword/login");
      assert(!!nonce, "no nonce in /usernamepassword/login");
      assert(!!req.session, "no session");

      let user = personQuery(
        (person) =>
          person.email?.toLowerCase() === username.toLowerCase() && person.password === password,
      );

      if (!user) {
        let query = req.query as QueryParams;
        let responseClientId = query.client_id ?? clientID;
        let responseAudience = query.audience ?? audience;

        assert(!!clientID, `no clientID assigned`);

        let html = loginView({
          domain: new URL(serviceURL(req)).host,
          scope,
          redirectUri: query.redirect_uri,
          clientID: responseClientId,
          audience: responseAudience,
          loginFailed: true,
        });

        res.set("Content-Type", "text/html");

        res.status(400).send(html);
        return;
      }

      req.session.username = username;

      simulationStore.store.dispatch(
        simulationStore.actions.batchUpdater([
          simulationStore.schema.sessions.patch({
            [nonce]: { username, nonce },
          }),
        ]),
      );

      res.status(200).send(userNamePasswordForm(req.body));
    },

    // https://auth0.com/docs/api/authentication#signup
    ["/dbconnections/signup"]: function (req, res) {
      logger.log({ "/dbconnections/signup": { body: { ...req.body, password: undefined } } });
      let { email, password, name, user_metadata } = req.body ?? {};

      let badRequest = (code: string, description: string) => {
        res.status(400).json({ name: "BadRequestError", code, description, statusCode: 400 });
      };

      if (options.disableSignup) {
        return badRequest("operation_not_allowed", "Public signup is disabled");
      }

      if (typeof email !== "string" || !email) {
        return badRequest("invalid_body", "Missing required property: email");
      }
      if (typeof password !== "string" || !password) {
        return badRequest("invalid_body", "Missing required property: password");
      }
      // Auth0 doesn't say whether the email is taken, to avoid user enumeration
      if (personQuery((person) => person.email?.toLowerCase() === email.toLowerCase())) {
        return badRequest("invalid_signup", "Invalid sign up");
      }

      let _id = faker.database.mongodbObjectId();
      let parsed = auth0UserSchema.safeParse({
        id: `auth0|${_id}`,
        name: name ?? email,
        email: email.toLowerCase(),
        email_verified: false,
        password,
        user_metadata: user_metadata ?? undefined,
      });
      if (!parsed.success) {
        return badRequest("invalid_body", parsed.error.message);
      }

      simulationStore.store.dispatch(
        simulationStore.actions.batchUpdater([
          simulationStore.schema.users.add({ [parsed.data.id]: parsed.data }),
        ]),
      );
      res.status(200).json({ _id, email: parsed.data.email, email_verified: false });
    },

    ["/login/callback"]: function (req, res) {
      let wctx = JSON.parse(req.body.wctx);
      logger.log({
        "/login/callback": { body: req.body, query: req.query, wctx },
      });

      let { redirect_uri, nonce } = wctx;

      const session = simulationStore.schema.sessions.selectById(simulationStore.store.getState(), {
        id: nonce,
      });

      const { username } = session ?? {};

      let encodedNonce = encode(`${nonce}:${username}`);

      let qs = stringify({ code: encodedNonce, ...wctx });

      let routerUrl = `${redirect_uri}?${qs}`;

      res.redirect(302, routerUrl);
    },

    ["/oauth/token"]: async function (req, res, next) {
      logger.log({ "/oauth/token": { body: req.body, query: req.query } });
      try {
        let iss = serviceURL(req);

        let responseClientId: string = (req?.body?.client_id as string) ?? clientID;
        let responseAudience: string = (req?.body?.audience as string) ?? audience;

        assert(!!responseClientId, "500::no clientID in options or request body");

        let tokens = await createTokens({
          simulationStore,
          body: req.body,
          iss,
          clientID: responseClientId,
          audience: responseAudience,
          rulesDirectory,
          actionsRunner,
          request: {
            query: req.query,
            ip: req.ip,
            hostname: req.hostname,
            method: req.method,
            user_agent: req.get("user-agent"),
          },
          scope,
        });

        res.status(200).json({
          ...tokens,
          expires_in: tokens.expires_in,
          token_type: "Bearer",
        });
      } catch (error) {
        if (error instanceof AccessDeniedError) {
          res.status(403).json({ error: "access_denied", error_description: error.message });
        } else {
          next(error);
        }
      }
    },

    ["/v2/logout"]: function (req, res) {
      req.session = null;

      let returnToUrl = req.query.returnTo ?? req.headers.referer;

      assert(typeof returnToUrl === "string", `no logical returnTo url`);

      res.redirect(returnToUrl);
    },

    ["/userinfo"]: function (req, res) {
      let token: string | null = null;
      if (req.headers.authorization) {
        let authorizationHeader = req.headers.authorization;
        token = authorizationHeader?.split(" ")?.[1];
      } else {
        token = req?.query?.access_token as string;
      }

      assert(!!token, "no authorization header or access_token");
      let { sub } = decodeToken(token);

      let user = personQuery((person) => {
        assert(!!person.id, `no email defined on person scenario`);

        return person.id === sub;
      });

      assert(!!user, "no user in /userinfo");

      let userinfo = {
        sub,
        name: user.name,
        given_name: user.name,
        family_name: user.name,
        email: user.email,
        email_verified: user.email_verified,
        locale: "en",
        hd: "okta.com",
      };

      res.status(200).json(userinfo);
    },

    ["/passwordless/start"]: function (req, res, next) {
      logger.log({ "/passwordless/start": { body: req.body } });

      try {
        const { client_id, connection, email, phone_number } = req.body;

        // Validate required fields
        if (!client_id) {
          res.status(400).json({ error: "client_id is required" });
          return;
        }

        if (!connection || (connection !== "email" && connection !== "sms")) {
          res.status(400).json({
            error: "connection must be 'email' or 'sms'",
          });
          return;
        }

        if (connection === "email" && !email) {
          res.status(400).json({
            error: "email is required when connection is 'email'",
          });
          return;
        }

        if (connection === "sms" && !phone_number) {
          res.status(400).json({
            error: "phone_number is required when connection is 'sms'",
          });
          return;
        }

        // Return appropriate response based on connection type
        if (connection === "email") {
          res.status(200).json({
            _id: "000000000000000000000000",
            email: email,
            email_verified: false,
          });
        } else {
          res.status(200).json({
            _id: "000000000000000000000000",
            phone_number: phone_number,
            phone_verified: false,
          });
        }
      } catch (error) {
        next(error);
      }
    },
  };
};
