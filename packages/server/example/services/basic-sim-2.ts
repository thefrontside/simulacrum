import {
  createFoundationSimulationServer,
  type FoundationSimulator,
} from "@simulacrum/foundation-simulator";

export function simulation(
  port: number = 3302,
  startDelay: number = 10
): FoundationSimulator<any> {
  const factory = createFoundationSimulationServer({
    port,
    extendRouter(router) {
      router.get("/status", (_req, res) => {
        res.status(200).send("ok");
      });
    },
  })();
  return factory;
}
