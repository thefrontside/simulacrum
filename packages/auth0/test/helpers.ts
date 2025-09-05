import { createFoundationSimulationServer } from "@simulacrum/foundation-simulator";

export const frontendSimulation = createFoundationSimulationServer({
  port: 3000,
  // dummy route so it returns a 200 at `/`
  extendRouter(router, simulationStore) {
    router.get("/", (req, res) => {
      res.sendStatus(200);
    });
  },
})();
