import express, { type Request, type Express } from "express";
import type { ExtendedSimulationStore } from "../store/index.ts";
import { createCors } from "../middleware/create-cors.ts";
import { noCache } from "../middleware/no-cache.ts";
import { createSession } from "../middleware/session.ts";
import { defaultErrorHandler } from "../middleware/error-handling.ts";
import { createAuth0Handlers } from "./auth0-handlers.ts";
import { createOpenIdHandlers } from "./openid-handlers.ts";
import path from "path";
import { fileURLToPath } from "url";
import { Auth0Configuration } from "../types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "views", "public");
export const extendRouter =
  (config: Auth0Configuration, debug = false) =>
  (router: Express, simulationStore: ExtendedSimulationStore) => {
    const serviceURL = (request: Request) =>
      `${request.protocol}://${request.get("Host")}/`;
    const auth0 = createAuth0Handlers(
      simulationStore,
      serviceURL,
      config,
      debug
    );
    const openid = createOpenIdHandlers(serviceURL);

    router
      .use(express.static(publicDir))
      .use(createSession())
      .use(createCors())
      .use(noCache())
      .get("/health", (_, response) => {
        response.send({ status: "ok" });
      })
      .get("/heartbeat", auth0["/heartbeat"])
      .get("/authorize", auth0["/authorize"])
      .get("/login", auth0["/login"])
      .get("/u/login", auth0["/usernamepassword/login"])
      .post("/usernamepassword/login", auth0["/usernamepassword/login"])
      .post("/login/callback", auth0["/login/callback"])
      .post("/oauth/token", auth0["/oauth/token"])
      .post("/passwordless/start", auth0["/passwordless/start"])
      .get("/userinfo", auth0["/userinfo"])
      .get("/v2/logout", auth0["/v2/logout"])
      .get("/.well-known/jwks.json", openid["/.well-known/jwks.json"])
      .get(
        "/.well-known/openid-configuration",
        openid["/.well-known/openid-configuration"]
      );

    // needs to be the last middleware added
    router.use(defaultErrorHandler);
  };
