import { SearchOptions } from '@backstage/backend-common';
import { JsonValue } from '@backstage/config';
import { SearchEntry } from 'ldapjs';
import { userTransformer } from './user-transformer';

export interface SearchCallback {
  (entry: SearchEntry): void;
}

export type LdapVendor = {
  /**
   * The attribute name that holds the distinguished name (DN) for an entry.
   */
  dnAttributeName: string;
  /**
   * The attribute name that holds a universal unique identifier for an entry.
   */
  uuidAttributeName: string;
  /**
   * Decode ldap entry values for a given attribute name to their string representation.
   *
   * @param entry The ldap entry
   * @param name The attribute to decode
   */
  decodeStringAttribute: (entry: SearchEntry, name: string) => string[];
};

export type BindConfig = {
  // The DN of the user to auth as, e.g.
  // uid=ldap-robot,ou=robots,ou=example,dc=example,dc=net
  dn: string;
  // The secret of the user to auth as (its password)
  secret: string;
};

export type UserConfig = {
  dn: string;
  options: SearchOptions;
  set?: {
    [path: string]: JsonValue;
  };
  map: {
    rdn: string;
    name: string;
    description?: string;
    displayName: string;
    email: string;
    avatar?: string;
    employeeType: string;
    co: string;
    l: string;
    memberOf: string;
  };
};

export type UserTransformer = typeof userTransformer;
