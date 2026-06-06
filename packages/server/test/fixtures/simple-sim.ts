import {
  createFoundationSimulationServer,
  type FoundationSimulator,
} from "@simulacrum/foundation-simulator";

export function simulation(port: number = 9999): FoundationSimulator<any> {
  return createFoundationSimulationServer({
    port,
  })();
}
