import { Slice } from '@effection/atom';
import { Client, createClient } from '@simulacrum/client';
import { TestState } from '../types';
import { makeCypressLogger } from './cypress-logger';

export interface MakeGetClientFromSpecOptions {
  atom: Slice<TestState>;
  port: number;
}

const log = makeCypressLogger('simulacrum-spec');

export const makeGetClientFromSpec = ({ atom, port }: MakeGetClientFromSpecOptions) => function getClientFromSpec (spec: string) {
  let client: Client;

  if(typeof atom.slice(spec).get()?.client?.createSimulation !== 'function') {
    log(`creating client for ${spec}`);
    client = createClient(`http://localhost:${port}`);
    atom.set({ [spec]: { client: client } });
  } else {
    log(`client already exists for ${spec}`);
    client = atom.slice(spec, 'client').get();
  }

  return client;
};
