import type { Task, Stream, Operation } from 'effection';
import { createStream, ensure, on, once, spawn } from 'effection';
import type { Client } from '@simulacrum/client';
import { createClient } from '@simulacrum/client';
import type { Server, ServerOptions } from '@simulacrum/server';
import { createSimulationServer } from '@simulacrum/server';
export type { Client, Simulation } from '@simulacrum/client';
import type { SearchEntryObject, SearchOptions } from 'ldapjs';
import { createClient as createLDAPJSClient } from 'ldapjs';

export function createTestServer(options: ServerOptions): Operation<Client> {
  return {
    *init(scope: Task) {
      let server: Server = yield createSimulationServer(options);
      let { port } = server.address;
      let client = createClient(`http://localhost:${port}`);
      yield scope.spawn(function*() {
        try {
          yield;
        } finally {
          client.dispose();
        }
      });
      return client;
    }
  };
}

export interface LDAP {
  bind(dn: string, secret: string): Operation<LDAPCommands>;
}

export interface LDAPCommands {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  search(base: string, options?: SearchOptions): Stream<SearchEntryObject & Record<string, any>, void>;
}

export function createLDAPClient(url: string): LDAP {
  return {
    bind(dn, secret) {
      return {
        name: 'LDAPCommands',
        *init() {
          let client = createLDAPJSClient({ url });

          // The mere attempt to `bind()` requires an `unbind()`,
          // so we have to put our ensure block first because
          // it must be called even in the event that `bind()` fails.
          yield ensure(() => new Promise<void>((resolve, reject) => {
            client.unbind(err => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }));

          yield new Promise((resolve, reject) => {
            client.bind(dn, secret, (err, value) => {
              if (err) {
                reject(err);
              } else {
                resolve(value);
              }
            });
          });


          return {
            search(base, options = {}) {
              return createStream(function*(publish) {
                let response = yield new Promise((resolve, reject) => {
                  client.search(base, options, (err, res) => {
                    if (err) {
                      reject(err);
                    } else {
                      resolve(res);
                    }
                  });
                });

                yield spawn(function*() {
                  throw yield once(response, 'error');
                });

                yield spawn(on<SearchEntryObject>(response, 'searchEntry').forEach(publish));

                yield once(response, 'end');
              });
            }
          };
        },
      };
    }
  };
}
