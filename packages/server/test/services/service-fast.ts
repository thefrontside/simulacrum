import { simulation as genSimulation } from "../../example/services/gen-sim-factory.ts";
import type { FoundationSimulator } from "@simulacrum/foundation-simulator";

export const simulation: FoundationSimulator<any> = genSimulation(4030, 10);
