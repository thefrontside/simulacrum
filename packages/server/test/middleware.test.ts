import { describe, it, beforeEach } from '@effection/mocha';
import { Simulator } from '../src/interfaces';
import { Client, Simulation } from '@simulacrum/client';
import { createTestServer } from './helpers';
import expect from 'expect';
import { createHttpApp, createLoggingMiddleware, Logger } from '../src';
import fetch from 'cross-fetch';

describe.only('simulator effects', () => {
  let client: Client;
  let simulation: Simulation;
  let msg = '';

  let createApp = (...loggers: Logger[]) => createHttpApp()
  .use(createLoggingMiddleware(...loggers))
  .post('/', function * (_, res){
    res.status(200).json({ a: 'ok' });
  });

  beforeEach(function* () {
    let app = createApp((log) => msg = log );

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

  it('should log message', function * () {
    let [{ url }] = simulation.services;

    let response = yield fetch(`${url.toString()}?q=a&b=c`, { method: 'POST', body: JSON.stringify({ msg: "hello world" }) });

    console.log(msg);
    expect(response.status).toBe(200);
    expect(msg).toContain('/?q=a&b=c');
    expect(msg).toContain('POST');
  });
});
