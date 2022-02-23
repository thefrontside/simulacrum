import { expectType } from 'tsd';

export interface SimulationOptions {
  options?: Record<string, unknown>;
  services?: Record<string,{
    port?: number
  }>;
  key?: string
  debug?: boolean;
}

