export interface SimulationOptions {
  options?: Record<string, unknown>;
  services?: Record<string,{
    port?: number
  }>;
  key?: string
  debug?: boolean;
}

export interface Simulation {
  id: string;
  status: 'new' | 'running' | 'failed',
  services: Service[];
}
