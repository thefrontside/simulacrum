import { describe, it } from 'mocha';
import expect from 'expect';

import { world } from './helpers';

import { createClient } from "@simulacrum/client";

import { spawnServer, Server } from '../src';

describe("@simulacrum/server", () => {
  let client;
  let server: Server;

  beforeEach(async () => {
    server = await spawnServer(world);
    client = createClient(`http://localhost:${server.port}`);
  });


  it('starts', () => {
    expect(typeof server.port).toBe('number');
  });
})
