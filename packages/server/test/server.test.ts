import { describe, it, beforeEach, captureError } from '@effection/mocha';
import { Client, Simulation } from '@simulacrum/client';
import { assert } from 'assert-ts';
import fetch from 'cross-fetch';
import expect from 'expect';

import { echo } from '../src/echo';
import { createHttpApp } from '../src/http';
import { ServerOptions } from '../src/interfaces';

import { createTestServer } from './helpers';

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
        { name: 'echo.secure', url: expect.stringMatching('https://localhost') }
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
    beforeEach(function*() {
      simulation = yield client.createSimulation("echo", {
        times: 3
      });
      let [{ url }] = simulation.services;
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

      simulation = yield client.createSimulation("static", { port: 3300 });
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
});



