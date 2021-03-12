import { createSimulation } from '../server';
import { Simulation, Simulator } from '../interfaces';
import { assert } from 'assert-ts';
import { Task } from 'effection';

export class SimulationContext {
  simulations: Record<string, Simulation> = {};
  constructor(private scope: Task, private availableSimulators: Record<string, Simulator>) {}

  async createSimulation(simulators: string | string[], id?: string): Promise<Simulation> {
    if(typeof id !== 'undefined' && !!this.simulations[id]) {
      let existing = this.simulations[id];

       await existing.scope.halt();  
    }
    
    simulators = Array.isArray(simulators) ? simulators : [simulators];

    // TODO if id is supplied we should check for an existing simulation and return it
    let simulation = createSimulation(this.scope.spawn(), id);

    for(let sim of simulators) {
      let simulator = simulation.simulators[sim] = this.availableSimulators[sim];

      assert(!!simulator, `no available simulator for ${sim}`);

      simulation = simulation.addSimulator(sim, simulator);
    }

    this.simulations[simulation.id] = simulation;

    return simulation;
  }
}