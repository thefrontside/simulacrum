import { createAtom } from '@effection/atom';
import { appDir } from '@simulacrum/ui';
import cors from 'cors';
import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { v4 } from 'uuid';
import { schema } from './schema/schema';
import type { ServerOptions, ServerState } from './interfaces';
import type { Server } from './http';
import { createServer } from './http';

export { Server, createServer } from './http';

import { stableIds } from './faker';
import { createWebSocketTransport } from './websocket-transport';
import type { Resource } from 'effection';
import { createOperationContext } from './operation-context';
import { createLogger } from './effects/logging';

const defaults = {
  simulators: {},
  debug: false
};

export function createSimulationServer(options: ServerOptions = defaults): Resource<Server> {
  let { simulators, debug, port, seed } = { ...defaults, ...options };

  return {
    *init(scope) {
      let newid = seed ? stableIds(seed) : v4;

      let atom = createAtom<ServerState>({
        debug: !!debug,
        simulations: {}
      });

      let context = createOperationContext(atom, scope, newid, simulators);

      let app = express()
        .use(cors())
        .disable('x-powered-by')
        .use(express.static(appDir()))
        .use('/', graphqlHTTP({ schema, context }));

      let server = yield createServer(app, { protocol: 'http', port });

      yield createWebSocketTransport(context, server.http);

      yield createLogger(atom);

      return server;
    }
  };
}
