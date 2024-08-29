import { createHandler } from "./handler";
import type { ExtendedSimulationStore } from "../store";
import type { Express } from "express";

export const extendRouter = (
  router: Express,
  simulationStore: ExtendedSimulationStore
) => {
  router.get("/health", (_, response) => {
    response.send({ status: "ok" });
  });

  router.use("/graphql", createHandler(simulationStore));
};
