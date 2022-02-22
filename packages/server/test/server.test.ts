import { describe, it, beforeEach, captureError } from '@effection/mocha';
import type { Client, Simulation } from '@simulacrum/client';
import { assert } from 'assert-ts';
import fetch from 'cross-fetch';
import expect from 'expect';

import getPort from 'get-port';
import { echo } from '../src/echo';
import { createHttpApp } from '../src/http';
import type { ServerOptions } from '../src/interfaces';
import udp from 'dgram';
import buffer from 'buffer';

import { createTestServer } from './helpers';
import type { Stream } from 'effection';
import { on, once, spawn, onEmit } from 'effection';

describe('@simulacrum/server', () => {
  let simulation: Simulation;
  let client: Client;
  let calls: string[] = [];

  let app = (times: number) => createHttpApp()
    .use(function* () {
      calls.push('one');
    }).use(function* () {
      calls.push('two');
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .use(function(_, __, next) {
      calls.push('three');

      next();
    })
    .post('/', echo(times));


  beforeEach(function* () {
    client = yield createTestServer({
      simulators: {
        echo: ((store, { times }) => {
          assert(typeof store !== 'undefined', 'store not getting passed to simulator');

          return {
            services: {
              echo: {
                protocol: 'http',
                app: app(times)
              },
              ["echo.secure"]: {
                protocol: 'https',
                app: app(times)
              },
              ["echo.udp"](slice, options) {
                return {
                  *init() {
                    let socket = udp.createSocket('udp4');

                    socket.bind(options.port);

                    yield once(socket, 'listening');

                    yield spawn(function *() {
                      try {
                        yield onEmit<[Buffer, udp.RemoteInfo]>(socket, 'message').forEach(([message, info]) => {
                          socket.send(message, info.port);
                        });
                      } finally {
                        yield new Promise<void>((resolve) => {
                          socket.close(resolve);
                        });
                      }
                    });


                    return {
                      port: socket.address().port,
                      protocol: 'udp'
                    };
                  }
                };
              }
            },
            scenarios: {}
          };
        }),
      }
    });
  });

  describe('createSimulation()', () => {
    beforeEach(function*() {
      simulation = yield client.createSimulation("echo");
    });

    it('creates a simulation', function * () {
      expect(typeof simulation.id).toBe('string');
    });

    it('has the echo service', function* () {
      expect(simulation.services).toEqual([
        { name: 'echo', url: expect.stringMatching('http://localhost') },
        { name: 'echo.secure', url: expect.stringMatching('https://localhost') },
        { name: 'echo.udp', url: expect.stringMatching('udp://localhost') }
      ]);
    });

    describe('posting to the http echo service', () => {
      let body: string;

      beforeEach(function*() {
        let [{ url }] = simulation.services;

        let response = yield fetch(url.toString(), { method: 'POST', body: "hello world" });
        expect(response.ok).toEqual(true);
        body = yield response.text();
      });

      it('gives you back what you gave it', function*() {
        expect(body).toEqual("hello world");
      });
    });

    describe('ResourceServiceCreator', () => {
      it('should create a udp service', function * (){
        let client = udp.createSocket('udp4');
        try {
          let response: Stream<string, void> = yield on<Buffer>(client, 'message').map(b => b.toString()).buffered();

          let message = buffer.Buffer.from('Hello');

          let service = simulation.services.find(s => s.name === 'echo.udp');

          assert(!!service, `no service found`);

          let { port } = new URL(service.url);

          client.send(message, Number(port));

          expect(yield response.first()).toBe("Hello");
        } finally {
          client.close();
        }
      });
    });

    describe('middleware', () => {
      it('should add middleware handlers', function* () {
        expect(calls).toEqual(['one', 'two', 'three']);
      });
    });

    describe('posting to the https echo service', () => {
      let body: string;

      beforeEach(function*() {
        let [, { url }] = simulation.services;

        let response = yield fetch(url.toString(), { method: 'POST', body: "hello world" });
        expect(response.ok).toEqual(true);
        body = yield response.text();
      });

      it('gives you back what you gave it', function*() {
        expect(body).toEqual("hello world");
      });
    });

    describe('destroySimulation()', () => {
      let destroyed: boolean;
      beforeEach(function*() {
        destroyed = yield client.destroySimulation(simulation);
      });

      it('indicates in the response that this operation tore down the simulation', function*() {
        expect(destroyed).toEqual(true);
      });

      it('tears down any running services', function*() {
        let [{ url }] = simulation.services;
        let response = fetch(url.toString(), { method: 'POST', body: "hello world" });
        expect(yield captureError(response)).toMatchObject({ name: 'FetchError' });
      });
    });
  });

  describe('createSimulation() with parameters', () => {
    let response: Response;
    let body: string;
    let serviceUrl: string;
    let port: number;
    beforeEach(function*() {
      port = yield getPort();

      expect(port).toBeDefined();

      simulation = yield client.createSimulation("echo", { options: {
        times: 3
      }, services: {
        echo: {
          port
        }
      } });
      let [{ url }] = simulation.services;
      serviceUrl = url;
      response = yield fetch(url.toString(), { method: 'POST', body: "hello world" });
      expect(response.ok).toBe(true);
      body = yield response.text();
    });

    it('can use those parameters to alter the behavor of its services', function*() {
      expect(body).toEqual(
        `hello world
hello world
hello world`);
    });

    it('assigns a static port to the service', function* () {
      expect(serviceUrl).toBe(`http://localhost:${port}`);
    });
  });

  describe('creating a simulator with static port', () => {
    let client: Client;
    let simulation: Simulation;
    let options: ServerOptions = {
      simulators: {
        static: () => ({ services: {
          static: {
            protocol: 'http',
            app: createHttpApp()
          }
        }, scenarios: {} })
      }
    };

    beforeEach(function*() {
      client = yield createTestServer(options);

      simulation = yield client.createSimulation("static", { services: { static: { port: 3300 } } });
    });

    it('creates simulations with the same uuid', function*() {
      let [{ url }] = simulation.services;

      expect(url).toBe('http://localhost:3300');
    });
  });

  describe('creating two servers with the same seed', () => {
    let one: Client;
    let two: Client;
    let options: ServerOptions = {
      seed: 5,
      simulators: {
        empty: () => ({ services: {}, scenarios: {} })
      }
    };

    beforeEach(function*() {
      one = yield createTestServer(options);
      two = yield createTestServer(options);
    });

    it('creates simulations with the same uuid', function*() {
      let first = yield one.createSimulation("empty");
      let second = yield two.createSimulation("empty");

      expect(first).toBeDefined();
      expect(second).toBeDefined();

      expect(first).toEqual(second);
    });
  });

  describe('calling createSimulation on a simulation that is being destroyed()', () => {
    beforeEach(function*() {
      simulation = yield client.createSimulation("echo", { key: 'sim' });
    });

    // not the greatest test, does not always fail
    it('should wait for the simulation to be destroyed before creating a new one', function*() {
      client.destroySimulation(simulation);
      simulation = yield client.createSimulation("echo", { key: 'sim' });
      expect(simulation.status).toEqual('running');
    });
  });
});
