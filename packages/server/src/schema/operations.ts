import { Resolver } from './resolvers';
import * as resolvers from './resolvers';

export const createSimulation = uncover(resolvers.createSimulation);
export const given = uncover(resolvers.given);

/**
 * Nexus types are currently a mess. This lets us take a soundly
 * typed resolver and replace all the safe types removed
 * so that the schema can compile. Maybe it doesn't have to be
 * this way, but that can be sorted out later. This is a compromise
 * that lets us move forward while maintaining type safety.
 */
function uncover(resolver: Resolver<unknown, unknown>) {
  return {
    resolve(_: any, args: any, context: any): Promise<any> {
      return resolver.resolve(args, context);
    }
  };
}
