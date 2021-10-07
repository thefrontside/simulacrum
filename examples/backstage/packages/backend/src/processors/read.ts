import { Entity } from '@backstage/catalog-model';
import { SearchEntry } from 'ldapjs';

import { LdapVendor, UserConfig } from '@backstage/plugin-catalog-backend-module-ldap';
import { Logger } from 'winston';
import { LdapClient } from './client';
import { UserTransformer } from './types';

export async function readLdapUsers(
  client: LdapClient,
  config: UserConfig,
  searchCallBack: (entity: Entity) => void,
  opts: { transformer: UserTransformer; logger: Logger },
): Promise<void> {
  const { logger, transformer } = opts;

  const { dn, options, map } = config;
  const vendor = await client.getVendor();

  const userMemberOf: Map<string, Set<string>> = new Map();

  logger.info(`starting search for ${dn}`);

  await client.searchStreaming(dn, options, async user => {
    const { map: oldMap, ...rest } = config;
    const newMap = { ...oldMap, email: 'uid', employeeType: 'employeeType', co: 'co', l: 'l' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entity = await transformer(vendor, { ...rest, map: newMap } as any, user);

    if (!entity) {
      return;
    }

    mapReferencesAttr(user, vendor, map.memberOf, (myDn, vs) => {
      ensureItems(userMemberOf, myDn, vs);
    });

    searchCallBack(entity);
  });
}

function mapReferencesAttr(
  entry: SearchEntry,
  vendor: LdapVendor,
  attributeName: string | undefined,
  setter: (sourceDn: string, targets: string[]) => void,
) {
  if (attributeName) {
    const values = vendor.decodeStringAttribute(entry, attributeName);
    const dn = vendor.decodeStringAttribute(entry, vendor.dnAttributeName);
    if (values && dn && dn.length === 1) {
      setter(dn[0], values);
    }
  }
}

function ensureItems(target: Map<string, Set<string>>, key: string, values: string[]) {
  if (key) {
    let set = target.get(key);
    if (!set) {
      set = new Set();
      target.set(key, set);
    }
    for (const value of values) {
      if (value) {
        set.add(value);
      }
    }
  }
}
