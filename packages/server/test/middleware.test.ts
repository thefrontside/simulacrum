import { describe, it, beforeEach } from '@effection/mocha';
import type { Simulator } from '../src/interfaces';
import type { Client, Simulation } from '@simulacrum/client';
import { createTestServer } from './helpers';
import expect from 'expect';
import type { HttpApp } from '../src';
import { createHttpApp, consoleLogger } from '../src';
import fetch from 'cross-fetch';
import { json } from 'express';

describe('middleware logging', () => {
  let client: Client;
  let simulation: Simulation;
  let app: HttpApp;

  beforeEach(function* () {
    app = createHttpApp()
      .use(json())
      .use(consoleLogger)
      .post('/', function * (_, res){
        res.status(200).json({ a: 'ok' });
      });

    let echo: Simulator = () => ({
      services: {
        echo: {
          protocol: 'http',
          app
        }
      },
      scenarios: {},
    });

    client = yield createTestServer({
      simulators: { echo },
    });

    simulation = yield client.createSimulation("echo");
  });

  afterEach(function *() {
    yield client.destroySimulation(simulation);
  });

  it('should log without error', function * () {
    let [{ url }] = simulation.services;

    let response = yield fetch(`${url.toString()}?q=a&b=c`, { method: 'POST', body: JSON.stringify({ msg: "hello world" }) });

    expect(response.status).toBe(200);
  });
});
