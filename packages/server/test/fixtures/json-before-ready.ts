import { createFoundationSimulationServer } from "@simulacrum/foundation-simulator";

// Print a JSON payload that does not contain `ready`/`port` fields
// This should be treated as a log line by the parent and ignored for readiness
console.log(JSON.stringify({ foo: "bar" }));

import type { FoundationSimulator } from "@simulacrum/foundation-simulator";

export function simulation(): FoundationSimulator<unknown> {
  return createFoundationSimulationServer({
    port: 0,
    extendRouter(router) {
      router.get("/info", (_req, res) => res.json({ ok: true }));
    },
  })();
}
