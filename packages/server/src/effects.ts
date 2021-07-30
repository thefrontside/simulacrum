import { Slice } from "@effection/atom";
import { Resource, spawn } from "effection";
import { ServerState, Simulator } from "./interfaces";
import { map } from './effect';
import { simulation } from './simulation';
import { createLogger } from './effects/logging';

export function createEffects(atom: Slice<ServerState>, available: Record<string, Simulator>): Resource<void> {
  return {
    name: 'server effects',
    *init() {
      yield spawn(map(atom.slice('simulations'), simulation(available)));
      yield createLogger(atom);
    }
  };
}
