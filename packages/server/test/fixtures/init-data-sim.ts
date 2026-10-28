import { createFoundationSimulationServer } from "@simulacrum/foundation-simulator";

import type { FoundationSimulator } from "@simulacrum/foundation-simulator";

export async function simulation(initData?: unknown): Promise<FoundationSimulator<unknown>> {
  if (
    initData &&
    typeof initData === "object" &&
    "startupDelayMs" in initData &&
    typeof initData.startupDelayMs === "number"
  ) {
    const delay = initData.startupDelayMs;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return createFoundationSimulationServer({
    port: 0,
    extendRouter(router) {
      router.get("/init", (_req, res) => res.json({ initData }));
    },
  })();
}
