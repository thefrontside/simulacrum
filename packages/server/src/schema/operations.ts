/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Resolver, Subscriber } from './resolvers';
import * as resolvers from './resolvers';

export const createSimulation = uncover(resolvers.createSimulation);
export const destroySimulation = uncover(resolvers.destroySimulation);
export const given = uncover(resolvers.given);
export const state = uncover(resolvers.state);

/**
 * Nexus types are currently a mess. This lets us take a soundly
 * typed resolver and replace all the safe types removed
 * so that the schema can compile. Maybe it doesn't have to be
 * this way, but that can be sorted out later. This is a compromise
 * that lets us move forward while maintaining type safety.
 */
function uncover(resolver: Resolver<unknown, unknown>): any;
function uncover(subscriber: Subscriber<unknown, unknown>): any;
function uncover(subject: Resolver<unknown, unknown> | Subscriber<unknown, unknown>): any {
  if (isSubscriber(subject)) {
    return {
      subscribe(_: any, args: any, context: any): any {
        return subject.subscribe(args, context);
      },
      resolve: (value: any) => subject.resolve ? subject.resolve(value) : value
    };
  } else {
    return {
      resolve(_: any, args: any, context: any): Promise<any> {
        return subject.resolve(args, context);
      }
    };
  }
}

function isSubscriber(subject: Resolver<unknown, unknown> | Subscriber<unknown,unknown>): subject is Subscriber<unknown, unknown> {
  return (subject as Subscriber<unknown,unknown>).subscribe !== undefined;
}
