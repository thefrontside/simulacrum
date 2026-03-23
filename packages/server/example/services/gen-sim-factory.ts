import {
  createFoundationSimulationServer,
  type FoundationSimulator,
} from "@simulacrum/foundation-simulator";

/*
  Helper to create a basic foundation simulation server with a configurable
  start delay to simulate slow startups. You would export your simulator
  more directly instead of wrapping it like this in a real project.
*/
export function simulation(
  port: number = 3301,
  startDelay: number = 10,
): (initData?: unknown) => FoundationSimulator<any> {
  return (initData?: unknown) => {
    const factory = createFoundationSimulationServer({
      port,
      extendRouter(router) {
        router.get("/status", (_req, res) => {
          res.status(200).send("ok");
        });
        router.get("/init-data", (_req, res) => {
          res.status(200).json({ data: initData ?? null });
        });
      },
    })();

    return {
      async listen(
        ...args: Parameters<FoundationSimulator<any>["listen"]>
      ): Promise<any> {
        if (startDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, startDelay));
        }
        // delegate to underlying factory listen
        return factory.listen(...args);
      },
    };
  };
}
