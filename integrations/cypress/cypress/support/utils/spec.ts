import type { Slice } from '@effection/atom';
import type { Client } from '@simulacrum/client';
import { createClient } from '@simulacrum/client';
import type { TestState } from '../types';

export interface MakeGetClientFromSpecOptions {
  atom: Slice<TestState>;
  port: number;
}

export const makeGetClientFromSpec = ({ atom, port }: MakeGetClientFromSpecOptions) => function getClientFromSpec (spec: string) {
  let client: Client;

  if(typeof atom.slice(spec).get()?.client?.createSimulation !== 'function') {
    client = createClient(`http://localhost:${port}`);
    atom.set({ [spec]: { client: client } });
  } else {
    client = atom.slice(spec, 'client').get();
  }

  // probably not needed but....good to know
  assert(typeof client?.createSimulation === 'function', 'no client created in getClientFromSpec');

  return client;
};
