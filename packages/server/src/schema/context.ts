import { createSimulation } from '../server';
import { Simulation } from '../interfaces';

export class Context {
  createSimulation(): Simulation {
    return createSimulation();
  }
}