import { createServer, InvalidCredentialsError, NoSuchObjectError, OperationsError } from 'ldapjs';
import { LDAPOptions } from './types';
import type { Simulator } from '@simulacrum/server';
import { ResourceServiceCreator } from '@simulacrum/server';
import { employees } from './employees';
import dedent from 'dedent';
import { person } from '@simulacrum/server';

const DefaultOptions: Partial<LDAPOptions> = {
  port: 389
};

employees.forEach(e => e.id = e.email);

function createLdapService(ldapOptions: LDAPOptions): ResourceServiceCreator {
  return () => {
    return {
      *init() {
        let port = Number(ldapOptions.port);
        let baseDN = ldapOptions.baseDN;
        let bindDn = ldapOptions.bindDn;
        let bindPassword = ldapOptions.bindPassword;
        let groupDN = ldapOptions.groupDN;

        let log = {
          debug: () => undefined,
          trace: () => undefined,
          warn: () => undefined,
          error: () => undefined,
        };

        let server = createServer({ log });
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
      ldap: createLdapService(ldapOptions),
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

