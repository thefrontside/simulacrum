export interface Service {
  name?: string;
  port: number;
  protocol: string;
}
export interface SimulationOptions<O> {
  options: O;
  services?: Record<string, Service>;
  key?: string
  debug?: boolean;
}

export interface Simulation {
  id: string;
  status: 'new' | 'running' | 'failed',
  services: Service[];
}
