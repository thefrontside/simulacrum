import { createAtom } from '@effection/atom';
import { appDir } from '@simulacrum/ui';
import { join } from 'path';
import cors from 'cors';
import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { v4 } from 'uuid';
import { schema } from './schema/schema';
import { ServerOptions, ServerState } from './interfaces';
import { Server, createServer } from './http';
import { OperationContext } from './schema/context';

export { Server, createServer } from './http';

import { createEffects } from './effects';
import { stableIds } from './faker';
import { createWebSocketTransport } from './websocket-transport';
import { Resource } from 'effection';

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

      let context: OperationContext = { atom, scope, newid };

      let app = express()
        .use(cors())
        .disable('x-powered-by')
        .use(express.static(appDir()))
        .get('/*', (req, res) => res.sendFile(join(appDir(), 'index.html')))
        .use('/', graphqlHTTP({ schema, context }));

      let server = yield createServer(app, { protocol: 'http', port });

      yield createWebSocketTransport(context, server.http);

      yield createEffects(atom, simulators);

      return server;
    }
  };
}
