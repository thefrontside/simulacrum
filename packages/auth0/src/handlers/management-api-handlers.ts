import { randomUUID } from "node:crypto";
import { STATUS_CODES } from "node:http";
import type { Request, RequestHandler, Response } from "express";
import { createLocalJWKSet, jwtVerify } from "jose";
import { faker } from "@faker-js/faker";
import { JWKS } from "../auth/constants.ts";
import {
  auth0UserSchema,
  identitiesOf,
  mergeMetadata,
  type Auth0User,
  type Metadata,
  type PasswordTicket,
} from "../store/entities.ts";
import type { AnyState } from "@simulacrum/foundation-simulator";
import type { ExtendedSimulationStore } from "../store/index.ts";
import { passwordResetForm, passwordResetMessage } from "../views/password-reset.ts";

export type ManagementRoutes =
  | "authenticate"
  | "POST /api/v2/users"
  | "GET /api/v2/users/:id"
  | "PATCH /api/v2/users/:id"
  | "DELETE /api/v2/users/:id"
  | "GET /api/v2/users-by-email"
  | "POST /api/v2/tickets/password-change"
  | "GET /lo/reset"
  | "POST /lo/reset";

const jwks = createLocalJWKSet(JWKS as unknown as Parameters<typeof createLocalJWKSet>[0]);
// Auth0 password-change tickets default to 5 days
const DEFAULT_TICKET_TTL_SEC = 432000;

// Auth0's Management API error body
const sendError = (res: Response, statusCode: number, message: string, errorCode?: string) => {
  res.status(statusCode).json({ statusCode, error: STATUS_CODES[statusCode], message, errorCode });
};

const toApiUser = (user: Auth0User) => ({
  user_id: user.id,
  email: user.email,
  email_verified: user.email_verified,
  name: user.name,
  picture: user.picture,
  user_metadata: user.user_metadata,
  app_metadata: user.app_metadata,
  logins_count: user.logins_count,
  identities: identitiesOf(user),
});

// PATCH merges metadata, except that an empty object clears it
// https://auth0.com/docs/manage-users/user-accounts/metadata/manage-user-metadata
const patchMetadata = (current: Metadata, update: unknown): Metadata =>
  update && typeof update === "object" && Object.keys(update).length === 0
    ? {}
    : mergeMetadata(current, update);

export const createManagementApiHandlers = (
  simulationStore: ExtendedSimulationStore,
  serviceURL: (request: Request) => string,
): Record<ManagementRoutes, RequestHandler> => {
  let { schema, store, actions } = simulationStore;

  let update = (...updaters: ((s: AnyState) => void)[]) =>
    store.dispatch(actions.batchUpdater(updaters));
  let users = () => schema.users.selectTableAsList(store.getState());
  let findById = (id: string) => users().find((user) => user.id === id);
  let findByEmail = (email: string) =>
    users().find((user) => user.email?.toLowerCase() === email.toLowerCase());

  let validTicket = (id: unknown): PasswordTicket | undefined => {
    if (typeof id !== "string") return undefined;
    let ticket = schema.passwordTickets.selectById(store.getState(), { id });
    return ticket && ticket.expiresAt > Date.now() ? ticket : undefined;
  };

  return {
    authenticate: async function (req, res, next) {
      let [scheme, token] = req.headers.authorization?.split(" ") ?? [];
      if (scheme !== "Bearer" || !token) {
        return sendError(res, 401, "Missing authentication");
      }
      try {
        // the key is public, so this is Auth0 parity rather than security: login tokens are refused
        let { payload } = await jwtVerify(token, jwks, { audience: `${serviceURL(req)}api/v2/` });
        // user tokens only get self-service scopes on Auth0; store-wide access is for M2M
        if (payload.gty !== "client-credentials") throw new Error("not a client_credentials token");
      } catch {
        return sendError(res, 401, "Invalid token");
      }
      next();
    },

    "POST /api/v2/users": function (req, res) {
      let { user_id, email, ...body } = req.body ?? {};
      if (typeof email !== "string" || !email) {
        return sendError(res, 400, "Payload validation error: 'Missing required property: email'.");
      }
      if (typeof body.password !== "string" || !body.password) {
        return sendError(
          res,
          400,
          "Payload validation error: 'Missing required property: password'.",
        );
      }
      if (user_id !== undefined && (typeof user_id !== "string" || !user_id)) {
        return sendError(
          res,
          400,
          "Payload validation error: 'user_id' must be a non-empty string.",
        );
      }
      if (findByEmail(email)) {
        return sendError(res, 409, "The user already exists.", "auth0_idp_error");
      }

      let parsed = auth0UserSchema.safeParse({
        id: `auth0|${user_id ?? faker.database.mongodbObjectId()}`,
        name: body.name ?? email,
        email: email.toLowerCase(),
        // Auth0 marks created users unverified unless told otherwise
        email_verified: body.email_verified ?? false,
        password: body.password,
        picture: body.picture,
        user_metadata: body.user_metadata,
        app_metadata: body.app_metadata,
      });
      if (!parsed.success) {
        return sendError(res, 400, `Payload validation error: ${parsed.error.message}`);
      }
      if (findById(parsed.data.id)) {
        return sendError(res, 409, "The user already exists.", "auth0_idp_error");
      }

      update(schema.users.add({ [parsed.data.id]: parsed.data }));
      res.status(201).json(toApiUser(parsed.data));
    },

    "GET /api/v2/users/:id": function (req, res) {
      let user = findById(req.params.id as string);
      if (!user) return sendError(res, 404, "The user does not exist.", "inexistent_user");
      res.status(200).json(toApiUser(user));
    },

    "PATCH /api/v2/users/:id": function (req, res) {
      let user = findById(req.params.id as string);
      if (!user) return sendError(res, 404, "The user does not exist.", "inexistent_user");

      let body = req.body ?? {};
      let parsed = auth0UserSchema.safeParse({
        ...user,
        ...(typeof body.name === "string" && { name: body.name }),
        ...(typeof body.email === "string" && { email: body.email.toLowerCase() }),
        ...(typeof body.email_verified === "boolean" && { email_verified: body.email_verified }),
        ...(typeof body.password === "string" && { password: body.password }),
        ...(typeof body.picture === "string" && { picture: body.picture }),
        user_metadata: patchMetadata(user.user_metadata, body.user_metadata),
        app_metadata: patchMetadata(user.app_metadata, body.app_metadata),
      });
      if (!parsed.success) {
        return sendError(res, 400, `Payload validation error: ${parsed.error.message}`);
      }
      let updated = parsed.data;

      let owner = updated.email && findByEmail(updated.email);
      if (owner && owner.id !== user.id) {
        return sendError(res, 409, "The specified new email already exists", "auth0_idp_error");
      }

      update(schema.users.add({ [user.id]: updated }));
      res.status(200).json(toApiUser(updated));
    },

    "DELETE /api/v2/users/:id": function (req, res) {
      update(schema.users.remove([req.params.id as string]));
      res.status(204).end();
    },

    "GET /api/v2/users-by-email": function (req, res) {
      let email = req.query.email;
      if (typeof email !== "string" || !email) {
        return sendError(res, 400, "Query validation error: 'Missing required property: email'.");
      }
      let user = findByEmail(email);
      res.status(200).json(user ? [toApiUser(user)] : []);
    },

    "POST /api/v2/tickets/password-change": function (req, res) {
      let body = req.body ?? {};
      let user = typeof body.user_id === "string" ? findById(body.user_id) : undefined;
      user ??= typeof body.email === "string" ? findByEmail(body.email) : undefined;
      if (!user) return sendError(res, 404, "The user does not exist.", "inexistent_user");

      // as in Auth0, an omitted or 0 ttl_sec means the default
      let ttl: unknown = body.ttl_sec === undefined ? 0 : body.ttl_sec;
      if (typeof ttl !== "number" || !Number.isSafeInteger(ttl) || ttl < 0) {
        return sendError(
          res,
          400,
          "Payload validation error: 'ttl_sec' must be a positive integer.",
        );
      }

      let ticket: PasswordTicket = {
        id: randomUUID(),
        userId: user.id,
        expiresAt: Date.now() + (ttl || DEFAULT_TICKET_TTL_SEC) * 1000,
        resultUrl: typeof body.result_url === "string" ? body.result_url : undefined,
        markEmailAsVerified: body.mark_email_as_verified === true,
      };
      update(schema.passwordTickets.add({ [ticket.id]: ticket }));

      res.status(201).json({ ticket: `${serviceURL(req)}lo/reset?ticket=${ticket.id}#` });
    },

    "GET /lo/reset": function (req, res) {
      let ticket = validTicket(req.query.ticket);
      let user = ticket && findById(ticket.userId);
      res.set("Content-Type", "text/html");
      if (!ticket || !user) {
        res
          .status(400)
          .send(passwordResetMessage("Link expired", "This link has expired or was already used."));
        return;
      }
      res
        .status(200)
        .send(passwordResetForm({ ticket: ticket.id, email: user.email ?? user.name }));
    },

    "POST /lo/reset": function (req, res) {
      let { ticket: ticketId, password } = req.body ?? {};
      let ticket = validTicket(ticketId);
      let user = ticket && findById(ticket.userId);
      res.set("Content-Type", "text/html");
      if (!ticket || !user) {
        res
          .status(400)
          .send(passwordResetMessage("Link expired", "This link has expired or was already used."));
        return;
      }
      if (typeof password !== "string" || !password) {
        res
          .status(400)
          .send(passwordResetForm({ ticket: ticket.id, email: user.email ?? user.name }));
        return;
      }

      update(
        schema.users.add({
          [user.id]: {
            ...user,
            password,
            ...(ticket.markEmailAsVerified && { email_verified: true }),
          },
        }),
        schema.passwordTickets.remove([ticket.id]),
      );

      if (ticket.resultUrl) {
        res.redirect(302, ticket.resultUrl);
        return;
      }
      res.status(200).send(passwordResetMessage("Password changed", "You can now log in."));
    },
  };
};
