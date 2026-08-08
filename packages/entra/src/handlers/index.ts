import express, { type Express, type Router } from "express";
import type { ExtendedSimulationStore } from "../store/index.ts";
import { createCors } from "../middleware/create-cors.ts";
import { noCache } from "../middleware/no-cache.ts";
import { createSession } from "../middleware/session.ts";
import { defaultErrorHandler } from "../middleware/error-handling.ts";
import { createEntraHandlers } from "./entra-handlers.ts";
import { createOpenIdHandlers } from "./openid-handlers.ts";
import type { EntraConfiguration } from "../types.ts";

export const extendRouter =
  (
    config: EntraConfiguration,
    extend: ((router: Router, simulationStore: ExtendedSimulationStore) => void) | undefined,
    debug = false,
  ) =>
  (router: Express, simulationStore: ExtendedSimulationStore) => {
    let entra = createEntraHandlers(simulationStore, config, debug);
    let openid = createOpenIdHandlers();

    router
      .use(express.json())
      .use(express.urlencoded({ extended: true }))
      .use(createSession(config.cookieSecret))
      .use(createCors())
      .use(noCache());

    if (extend) {
      extend(router, simulationStore);
    }

    router
      .get("/health", (_req, res) => {
        res.send({ status: "ok" });
      })
      // OpenID discovery + keys (tenant scoped, as with real Entra)
      .get("/:tenant/v2.0/.well-known/openid-configuration", openid.openidConfiguration)
      .get("/:tenant/discovery/v2.0/keys", openid.jwks)
      // AAD instance discovery — MSAL calls `<host>/common/discovery/instance`
      .get("/:tenant/discovery/instance", openid.instanceDiscovery)
      // core OAuth2 v2.0 endpoints
      .get("/:tenant/oauth2/v2.0/authorize", entra["/authorize"])
      .post("/:tenant/oauth2/v2.0/authorize", entra["/authorize"])
      .post("/:tenant/login", entra["/login"])
      .post("/:tenant/oauth2/v2.0/token", entra["/token"])
      .get("/:tenant/oauth2/v2.0/logout", entra["/logout"])
      .get("/:tenant/oauth2/v2.0/heartbeat", entra["/heartbeat"])
      // Microsoft Graph style userinfo endpoint
      .get("/oidc/userinfo", entra["/userinfo"])
      .post("/oidc/userinfo", entra["/userinfo"]);

    // needs to be the last middleware added
    router.use(defaultErrorHandler);
  };
