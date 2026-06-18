import { createFoundationSimulationServer } from "@simulacrum/foundation-simulator";

import type { FoundationSimulator } from "@simulacrum/foundation-simulator";

export function simulation(initData?: unknown): FoundationSimulator<unknown> {
  return createFoundationSimulationServer({
    port: 0,
    extendRouter(router) {
      router.get("/init", (_req, res) => res.json({ initData }));
    },
  })();
}
