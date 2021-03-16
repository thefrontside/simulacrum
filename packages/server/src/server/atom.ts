import type { Slice } from '@effection/atom';
import type { Simulation } from '../interfaces';
import { createAtom } from '@effection/atom';

export interface SimulationState {
  simulations: Record<string, Simulation>
}

export const initialSimulationState: SimulationState = { simulations: {} };

export function createSimulationAtom(initialState: SimulationState = initialSimulationState): Slice<SimulationState> {
  return createAtom<SimulationState>(initialState);
}
