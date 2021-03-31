import { Resolver } from './resolvers';
import * as resolvers from './resolvers';

export const createSimulation = createResolve(resolvers.createSimulation);

export const given = createResolve(resolvers.given);

function createResolve(resolver: Resolver<unknown, unknown>) {
  return {
    resolve(_: any, args: any, context: any): Promise<any> {
      return resolver.resolve(args, context);
    }
  };
}
