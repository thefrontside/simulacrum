export interface Client {
  createSimulation(simulator: string): Promise<Simulation>;
}

export interface Simulation {
  services: Record<string, Service>;
}

export interface Service {
  name: string;
  url: URL;
}

export function createClient(_serverURL: string): Client {
  async function createSimulation() {
    return { services: {} }
  }
  return { createSimulation };
}
