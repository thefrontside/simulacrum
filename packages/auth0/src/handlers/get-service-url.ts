import type { Options } from '../types';
import { assert } from 'assert-ts';

export const getServiceUrl = (options: Options): URL => {
  let service = options.services.get().find(({ name }) => name === 'auth0' );

  assert(!!service, `did not find auth0 service in set of running services`);

  return new URL(service.url);
};
