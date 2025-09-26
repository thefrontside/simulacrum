import { Router } from "express";
import type { ExtendedSimulationStore } from "./store.ts";

export const extendRouter = (
  router: Router,
  simulationStore: ExtendedSimulationStore
) => {
  router.get("/extended-route", (req, res) => {
    let dogs = simulationStore.schema.dogs.select(
      simulationStore.store.getState()
    );
    res.status(200).json({ dogs });
  });
};
