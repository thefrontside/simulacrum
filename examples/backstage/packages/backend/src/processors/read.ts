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
  let { logger, transformer } = opts;

  let { dn, options, map } = config;
  let vendor = await client.getVendor();

  let userMemberOf: Map<string, Set<string>> = new Map();

  logger.info(`starting search for ${dn}`);

  await client.searchStreaming(dn, options, async user => {
    let { map } = config;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let entity = await transformer(vendor, { map } as any, user);

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
    let values = vendor.decodeStringAttribute(entry, attributeName);
    let dn = vendor.decodeStringAttribute(entry, vendor.dnAttributeName);
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
    for (let value of values) {
      if (value) {
        set.add(value);
      }
    }
  }
}
