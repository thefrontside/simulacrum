import { assert } from 'assert-ts';
import type { SimulationState } from '@simulacrum/server';

export const getServiceUrl = (options: SimulationState): URL => {
  let service = options.services.find(({ name }) => name === 'auth0' );

  assert(!!service, `did not find auth0 service in set of running services`);

  return new URL(service.url);
};
