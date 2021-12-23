import { Slice } from '@effection/atom';
import { Client, createClient } from '@simulacrum/client';
import { TestState } from '../types';

export interface MakeGetClientFromSpecOptions {
  atom: Slice<TestState>;
  port: number;
}

export const makeGetClientFromSpec = ({ atom, port }: MakeGetClientFromSpecOptions) => function getClientFromSpec (spec: string) {
  let client: Client;

  if(!atom.slice(spec).get()) {
    client = createClient(`http://localhost:${port}`);
    atom.set({ [spec]: { client: client } });
  }

  return atom.slice(spec, 'client').get();
};
