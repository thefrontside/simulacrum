import { createSimulation } from '../server';
import { Simulation } from '../interfaces';

export class SimulationContext {
  createSimulation(): Simulation {
    return createSimulation();
  }
}