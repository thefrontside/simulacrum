import type { Server } from 'ldapjs';
import type { Operation } from 'effection';
import { createServer, InvalidCredentialsError, NoSuchObjectError, OperationsError } from 'ldapjs';
import type { LDAPOptions } from './types';
import type { SimulationState, Simulator } from '@simulacrum/server';
import type { ResourceServiceCreator } from '@simulacrum/server';
import dedent from 'dedent';
import { person } from '@simulacrum/server';
import { spawn } from 'effection';
import getPort from 'get-port';
import type { Slice } from '@effection/atom';

const DefaultOptions: Partial<LDAPOptions> = {
  port: 389
};

interface UserData {
  id: string | number;
  email: string;
  password: string;
}

export interface LDAPStoreOptions<T extends UserData> {
  users: Iterable<T>;
}

export interface Port {
  port: number;
}

export function createLDAPServer<T extends UserData>(options: LDAPOptions & LDAPStoreOptions<T>): Operation<Server & Port> {
  return {
    name: 'LDAPServer',
    *init() {

      let port = options.port ?? (yield getPort());
      let baseDN = options.baseDN;
      let bindDn = options.bindDn;
      let bindPassword = options.bindPassword;
      let groupDN = options.groupDN;

      let silence = {
        debug: () => undefined,
        trace: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      };

      let logger = options.log || options.log == null ? console : {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        log: (..._: unknown[]) => {}
      };


      let server = createServer({ log: silence });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      server.search(baseDN, function (req: any, res: any, next: any) {
        logger.log(dedent`--- User Search ---
dn:     ${req.dn.toString()}
scope:  ${req.scope}
filter: ${req.filter.toString()}
`);

        let users = [...options.users];

        for (let [id, entry] of Object.entries(users)) {
          let groups = [`cn=users,${groupDN}`];

          let user = {
            dn: `cn=${id},${baseDN}`,
            attributes: {
              objectclass: ['user'],
              uid: entry.id,
              ...entry,
              memberof: groups,
            },
          };

          if (req.filter.matches(user.attributes)) {
            logger.log(`Sending ${user.attributes.email}`);
            res.send(user);
          }
        }

        res.end();

        return next();
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      server.compare(groupDN, (req: any, res: any) => {
        logger.log('--- Compare ---');
        logger.log(`DN: ${req.dn.toString()}`);
        logger.log(`attribute name: ${req.attribute}`);
        logger.log(`attribute value: ${req.value}`);

        res.end(true);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      server.bind(baseDN, function (req: any, res: any, next: any) {
        logger.log('--- Bind ---');
        logger.log(`bind DN: ${req.dn.toString()}`);
        logger.log(`bind PW: ${req.credentials}`);

        let commonName = req.dn.rdns[0].attrs.cn.value;
        if (!commonName) {
          return next(new NoSuchObjectError(req.dn.toString()));
        }

        let password = req.credentials;
        logger.log('verify:', commonName, password);

        let users = [...options.users];

        let user = users.filter(u => u.id === commonName)?.[0];

        if (typeof user === 'undefined') {
          logger.log('could not find user');
          return next(new NoSuchObjectError(req.dn.toString()));
        }

        if (user.password !== password) {
          logger.log(`bad password ${password} for ${user.email}`);
          return next(new InvalidCredentialsError(req.dn.toString()));
        }

        if (commonName === bindDn && password === bindPassword) {
          logger.log(`bind succeeded for ${bindDn}`);
          res.end();
        } else {
          return next(new OperationsError('could not find user'));
        }
      });

      server.listen(port, function () {
        logger.log(dedent`LDAP test server running on port ${port});

BindDN: bindDn = ${bindDn} cn=${bindDn},${baseDN}
Bind Password: ${bindPassword}

UserBaseDN:    ${bindDn}
`);
      });

      yield spawn(function* shutdown() {
        try {
          yield;
        } finally {
          yield new Promise<void>(resolve => {
            server?.close(() => {
              logger.log('ldap server closed');
              resolve();
            });
          });
        }
      });

      return { ...server, port };
    }
  };
}

export function createLdapService<T extends UserData>(options: LDAPOptions, state: Slice<SimulationState>): ResourceServiceCreator {
  return () => {
    let users = {
      *[Symbol.iterator]() {
        let entries = state.slice('store', 'people').get() ?? [];
        for (let user of Object.values(entries)) {
          yield { ...user, id: user.email };
        }
      }
    } as Iterable<T>;

    return {
      name: 'LDAPService',
      *init() {
        let server = yield createLDAPServer({
          ...options,
          users
        });
        return {
          port: server.port,
          protocol: 'ldap',
        };
      }
    };
  };
}

export const ldap: Simulator<LDAPOptions> = (slice, options) => {
  let ldapOptions = { ...DefaultOptions, ...options };

  return {
    services: {
      ldap: createLdapService(ldapOptions, slice),
    },
    scenarios: {
      person
    }
  };
};
