import { createServer, InvalidCredentialsError, NoSuchObjectError, OperationsError, Server } from 'ldapjs';
import { LDAPOptions } from './types';
import type { SimulationState, Simulator } from '@simulacrum/server';
import { ResourceServiceCreator } from '@simulacrum/server';
import dedent from 'dedent';
import { person } from '@simulacrum/server';
import { spawn } from 'effection';
import getPort from 'get-port';
import { Slice } from '@effection/atom';
import { assert } from 'assert-ts';


const DefaultOptions: Partial<LDAPOptions> = {
  port: 389
};


interface UserData{
  id: string | number;
  email: string;
  password: string;
}

export function createLdapService<T extends UserData>(ldapOptions: LDAPOptions, state: Slice<SimulationState>): ResourceServiceCreator {
  return () => {
    let server: Server;

    return {
      name: 'ldap service',
      *init() {
        let port = ldapOptions.port ?? (yield getPort());
        let baseDN = ldapOptions.baseDN;
        let bindDn = ldapOptions.bindDn;
        let bindPassword = ldapOptions.bindPassword;
        let groupDN = ldapOptions.groupDN;
        let users = state.slice('store', 'people').get();

        assert(!!users, 'no scenarios in store/people');

        let employees = Object.values(users).map(u => ({ ...u, id: u.email })) as T[];

        let log = {
          debug: () => undefined,
          trace: () => undefined,
          warn: () => undefined,
          error: () => undefined,
        };

        server = createServer({ log });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        server.search(baseDN, function (req: any, res: any, next: any) {
          console.log(dedent`--- User Search ---
          dn:     ${req.dn.toString()}
          scope:  ${req.scope}
          filter: ${req.filter.toString()}
          `);

          for (let entry of employees) {
            let groups = [`cn=users,${groupDN}`];

            let employee = {
              dn: `cn=${entry.id},${baseDN}`,
              attributes: {
                objectclass: ['user'],
                uid: entry.id,
                ...entry,
                memberof: groups,
              },
            };

            if (req.filter.matches(employee.attributes)) {
              console.log(`Sending ${employee.attributes.email}`);
              res.send(employee);
            }
          }

          res.end();

          return next();
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        server.compare(groupDN, (req: any, res: any) => {
          console.log('--- Compare ---');
          console.log(`DN: ${req.dn.toString()}`);
          console.log(`attribute name: ${req.attribute}`);
          console.log(`attribute value: ${req.value}`);

          res.end(true);
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        server.bind(baseDN, function (req: any, res: any, next: any) {
          console.log('--- Bind ---');
          console.log(`bind DN: ${req.dn.toString()}`);
          console.log(`bind PW: ${req.credentials}`);

          let commonName = req.dn.rdns[0].attrs.cn.value;
          if (!commonName) {
            return next(new NoSuchObjectError(req.dn.toString()));
          }

          let password = req.credentials;
          console.log('verify:', commonName, password);


          let employee = employees.filter(u => u.id === commonName)?.[0];

          if (typeof employee === 'undefined') {
            console.log('could not find employee');
            return next(new NoSuchObjectError(req.dn.toString()));
          }

          if (employee.password !== password) {
            console.log(`bad password ${password} for ${employee.email}`);
            return next(new InvalidCredentialsError(req.dn.toString()));
          }

          if (commonName === bindDn && password === bindPassword) {
            console.log(`bind succeeded for ${bindDn}`);
            res.end();
          } else {
            return next(new OperationsError('could not find user'));
          }
        });

        server.listen(port, function () {
          console.log(dedent`LDAP test server running on port ${port});

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
                console.log('ldap server closed');
                resolve();
              });
            });
          }
        });

        return {
          port,
          protocol: 'ldap'
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
      /**
       * Here we just export the internal `person` scenario so that it can be
       * used with the a standalone auth0 simulator. However,
       * what we really need to have some way to _react_ to the person
       * having been created and augment the record at that point.
       */
      person
    }
  };
};
