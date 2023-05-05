import express from 'express';
import Router from 'express-promise-router';
import { createHandler } from './handler';
import cors from 'cors';
import type { Server } from 'http';
import type { SimulatedData } from './types';

export interface ServerOptions extends SimulatedData {
  port?: number;

  /**
   * Extend the capabilities of the Express Router simulating the GithHub API
   * with custom middlewares, and custom endpoints.
   *
   * @param ext an extenstion function that accepts the Express Router to make
   * changes to it
   */
  extend?(router: express.Router): void;
}

export async function startStandaloneServer({
  port,
  users,
  githubRepositories,
  githubOrganizations,
  extend,
}: ServerOptions): Promise<Server> {
  let router = Router();

  router.use(express.json());

  router.get('/health', (_, response) => {
    response.send({ status: 'ok' });
  });

  router.use(
    '/graphql',
    createHandler({ users, githubRepositories, githubOrganizations }),
  );

  if (extend) {
    extend(router);
  }

  let app = express().use(cors()).use(router);

  let server = app.listen(port);

  if (!server.listening) {
    await new Promise<void>(resolve => {
      server.once('listening', resolve);
    });
  }

  return server;
}
