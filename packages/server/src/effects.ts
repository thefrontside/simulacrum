import { Slice } from "@effection/atom";
import { Resource, spawn } from "effection";
import { ServerState, Simulator } from "./interfaces";
import { map } from './effect';
import { simulation } from './simulation';

export function createEffects(atom: Slice<ServerState>, available: Record<string, Simulator>): Resource<void> {
  return {
    *init() {
      yield spawn(map(atom.slice('simulations'), simulation(available)));
    }
  };
}
