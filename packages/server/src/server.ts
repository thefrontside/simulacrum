import { createAtom } from '@effection/atom';
import { appDir } from '@simulacrum/ui';
import cors from 'cors';
import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { v4 } from 'uuid';
import { schema } from './schema/schema';
import { ServerOptions, ServerState } from './interfaces';
import { Server, createServer } from './http';
import { SimulationContext } from './schema/context';

export { Server, createServer } from './http';
export type { AddressInfo } from './http';
import type { Runnable } from './interfaces';

import { createEffects } from './effects';
import { stableIds } from './faker';

export function createSimulationServer(options: ServerOptions = { simulators: {} }): Runnable<Server> {
  let { port } = options;
  return {
    run(scope) {
      let newid = options.seed ? stableIds(options.seed) : v4;

      let atom = createAtom<ServerState>({
        simulations: {}
      });

      let context = new SimulationContext(scope, atom.slice('simulations'), newid);

      createEffects(atom, options.simulators).run(scope);

      let app = express()
        .use(cors())
        .disable('x-powered-by')
        .use('/', express.static(appDir()))
        .use('/', graphqlHTTP({ schema, context }));

      return createServer(app, { port }).run(scope);
    }
  };
}
