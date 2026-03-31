import { createFoundationSimulationServer } from "@simulacrum/foundation-simulator";

export const frontendSimulation: ReturnType<ReturnType<typeof createFoundationSimulationServer>> =
  createFoundationSimulationServer({
    port: 3000,
    // dummy route so it returns a 200 at `/`
    extendRouter(router, _simulationStore) {
      router.get("/", (_req, res) => {
        res.sendStatus(200);
      });
    },
  })();
