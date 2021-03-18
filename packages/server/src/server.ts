import { createAtom } from '@effection/atom';
import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { schema } from './schema/schema';
import { ServerOptions, ServerState } from './interfaces';
import { Server, createServer } from './http';
import { SimulationContext } from './schema/context';

export { Server, createServer } from './http';
export type { AddressInfo } from './http';
import type { Runnable } from './interfaces';

import { createEffects } from './effects';

export function createSimulationServer(options: ServerOptions = { simulators: {} }): Runnable<Server> {
  let { port } = options;
  return {
    run(scope) {
      let atom = createAtom<ServerState>({
        simulations: {}
      });

      let context = new SimulationContext(scope, atom.slice('simulations'));

      createEffects(atom, options.simulators).run(scope);

      let app = express()
        .disable('x-powered-by')
        .use('/graphql', graphqlHTTP({ schema, graphiql: true, context }));

      return createServer(app, { port }).run(scope);
    }
  };
}
