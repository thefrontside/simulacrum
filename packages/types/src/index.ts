export interface SimulationOptions<O> {
  options: O;
  services?: Record<string,{
    port?: number
  }>;
  key?: string
  debug?: boolean;
}


export interface Service {
  name?: string;
  port: number;
  protocol: string;
}
export interface Simulation {
  id: string;
  status: 'new' | 'running' | 'failed',
  services: Service[];
}
