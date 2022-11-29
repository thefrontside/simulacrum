import express from 'express';
import Router from 'express-promise-router';
import { createHandler } from './handler';
import cors from 'cors';
import type { Server } from 'http';
import type { SimulatedData } from './types';

export interface ServerOptions extends SimulatedData {
  port?: number;
}

export async function startStandaloneServer({
  port,
  users,
  githubRepositories,
  githubOrganizations,
}: ServerOptions): Promise<Server> {
  const router = Router();

  router.use(express.json());

  router.get('/health', (_, response) => {
    response.send({ status: 'ok' });
  });

  router.use(
    '/graphql',
    createHandler({ users, githubRepositories, githubOrganizations }),
  );

  const app = express().use(cors()).use(router);

  const server = app.listen(port);

  if (!server.listening) {
    await new Promise<void>(resolve => {
      server.once('listening', resolve);
    });
  }

  return server;
}
