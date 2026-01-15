import { createFoundationSimulationServer } from "@simulacrum/foundation-simulator";

import type { FoundationSimulator } from "@simulacrum/foundation-simulator";

export function simulation(): FoundationSimulator<unknown> {
  // print some non-JSON diagnostic before the line the parent will JSON-parse
  console.log("preflight: starting up");
  return createFoundationSimulationServer({
    port: 0,
    extendRouter(router) {
      router.get("/info", (_req, res) => res.json({ ok: true }));
    },
  })();
}
