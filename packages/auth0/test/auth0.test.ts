import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';
import { createTestServer, Client, Simulation } from './helpers';
import { auth0 } from '../src';
import fetch from 'cross-fetch';
import { stringify } from 'querystring';
import { Person } from '@simulacrum/server';
import nock from 'nock';

describe('Auth0 simulator', () => {
  let client: Client;
  beforeEach(function*() {
    client = yield createTestServer({
      simulators: { auth0 }
    });
  });

  describe("Creating a simulation with an Auth0 simulator", () => {
    let simulation: Simulation;
    beforeEach(function*() {
      simulation = yield client.createSimulation("auth0");
    });

    it('starts the simulation', function*() {
      expect(simulation.status).toEqual('running');
    });
  });

  describe('authorize', () => {

    beforeEach(function*() {
      yield client.createSimulation("auth0", { services: {
        auth0: { port: 4400 }
      } });
    });

    it('should authorize', function *() {
      let res: Response = yield fetch(`https://localhost:4400/authorize?${stringify({
        client_id: "1234",
        redirect_uri: "http://localhost:3000",
        response_type: "code",
        response_mode: "query",
        state: "MVpFN0JXWGNFUVNVQnJjNGlXZWFNbGd2V3M2MC5VRkwyV1VKNW9wRTZVVw==",
        nonce: "dDJ6NX5aUFU3SlM4TEozQThyR0V0fjdjRlJDZ0YzfjNDcEV3OWIzWWVYbQ==",
        code_challenge: "2Arx2VYcTp6YDa5r-exGr99upqSIqYZQ_vBbI_7taQ0",
        code_challenge_method: "S256",
        auth0Client: "eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMS4xLjAifQ==",
      })}`);

      expect(res.redirected).toBe(true);
      expect(res.url).toContain('/login');
    });
  });

  let Fields = {
    audience: "https://thefrontside.auth0.com/api/v1/",
    client_id: "00000000000000000000000000000000",
    connection: "Username-Password-Authentication",
    nonce: "aGV6ODdFZjExbF9iMkdYZHVfQ3lYcDNVSldGRDR6dWdvREQwUms1Z0Ewaw==",
    redirect_uri: "http://localhost:3000",
    response_type: "token id_token",
    scope: "openid profile email offline_access",
    state: "sxmRf2Fq.IMN5SER~wQqbsXl5Hx0JHov",
    tenant: "localhost:4400",
  };

  describe('login', () => {
    let simulation: Simulation;
    let person: {data: Person};
    let url: string;

    beforeEach(function* () {
      simulation = yield client.createSimulation("auth0");
      url = simulation.services[0].url;

      person = yield client.given(simulation, "person");
    });

    it('should login with valid credentials', function*(){
      let res: Response = yield fetch(`${url}/usernamepassword/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...Fields,
          username: person.data.email,
          password: person.data.password,
        })
      });

      expect(res.ok).toBe(true);
    });

    it('should fail with invalid credentials', function*(){
      let res: Response = yield fetch(`${url}/usernamepassword/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...Fields,
          username: 'bob',
          password: 'no-way',
        })
      });

      expect(res.status).toBe(400);
    });
  });

  describe('/login/callback', () => {
    let simulation: Simulation;
    let person: {data: Person};

    let scope = nock('http://localhost:3000').get(/\/\?code=*/).reply(200);

    beforeEach(function* () {
      simulation = yield client.createSimulation("auth0", { services: {
        auth0: { port: 4400 }
      } });

      person = yield client.given(simulation, "person");

      // prime the server with the nonce field
      yield fetch(`https://localhost:4400/usernamepassword/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...Fields,
          username: person.data.email,
          password: person.data.password,
        })
      });
    });

    it('should post to /login/callback', function* () {
      let fields = encodeURIComponent(JSON.stringify({
        ...Fields
      }));

      let res: Response = yield fetch(`https://localhost:4400/login/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `wctx=${fields}`
      });

      expect(res.status).toBe(200);

      expect(scope.isDone()).toBe(true);
    });
  });
});
