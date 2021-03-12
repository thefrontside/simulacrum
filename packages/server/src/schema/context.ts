import { createSimulation } from '../server';
import { Simulation, Simulator } from '../interfaces';
import { assert } from 'assert-ts';

export class SimulationContext {
  constructor(private availableSimulators: Record<string, Simulator>) {}

  createSimulation(simulators: string | string[], id?: string): Simulation {
    simulators = Array.isArray(simulators) ? simulators : [simulators];

    // TODO if id is supplied we should check for an existing simulation and return it
    let simulation = createSimulation(id);

    for(let sim of simulators) {
      let simulator = simulation.simulators[sim] = this.availableSimulators[sim];

      assert(!!simulator, `no available simulator for ${sim}`);

      simulation = simulation.addSimulator(sim, simulator);
    }

    return simulation;
  }
}