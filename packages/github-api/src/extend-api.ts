import type { Express } from "express";
import { stringify } from "querystring";
import { createHandler } from "./graphql/handler";
import type { ExtendedSimulationStore } from "./store";

export const extendRouter = (
  router: Express,
  simulationStore: ExtendedSimulationStore
) => {
  router.get("/health", (_, response) => {
    response.send({ status: "ok" });
  });

  router.use("/graphql", createHandler(simulationStore));

  router.get(["/login/oauth/authorize"], (request, response) => {
    const { redirect_uri, state, env, client_id, scope } = request.query as {
      [k: string]: string;
    };
    const code = "dev_code";
    const qs = stringify({
      code,
      env,
      state,
    });

    const routerUrl = `${redirect_uri}?${qs}`;
    response.status(302).redirect(routerUrl);
  });

  router.post(
    [
      "/login/oauth/access_token",
      "/api/v3/app/installations/:id/access_tokens",
    ],
    (_request, response) => {
      // for /login/oauth/access_token
      const access_token = "dev_access_token";
      // for /app/installations/:id/access_tokens
      const token = "dev_token";
      const refresh_token = "dev_refresh_token";
      const repository_selection = "all";
      response.json({
        access_token,
        refresh_token,
        token,
        repository_selection,
      });
      response.status(200);
      response.end();
    }
  );
};
