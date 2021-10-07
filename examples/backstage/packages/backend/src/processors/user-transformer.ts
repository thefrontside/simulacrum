import type { SearchEntry } from 'ldapjs';
import {
  LdapVendor,
  LDAP_DN_ANNOTATION,
  LDAP_RDN_ANNOTATION,
  LDAP_UUID_ANNOTATION,
  mapStringAttr,
} from '@backstage/plugin-catalog-backend-module-ldap';
import lodashSet from 'lodash/set';
import { assert } from 'assert-ts';
import { UserEntityV2alpha1 as UserEntity } from '../../models/user/user-entity-v2-alpha1';
import { UserConfig } from './types';

export function normalizeEntityName(raw: string): string | undefined {
  return raw
    .match(/^.+(?=@)/)?.[0]
    .replace(/-$/g, '')
    .replace('.', '-');
}

function setAnnotations(entity: UserEntity, entry: SearchEntry, vendor: LdapVendor, map: UserConfig['map']) {
  for (const annotation of [LDAP_RDN_ANNOTATION, LDAP_UUID_ANNOTATION, LDAP_DN_ANNOTATION] as const) {
    mapStringAttr(entry, vendor, map.rdn, v => {
      if (!entity.metadata.annotations) {
        return;
      }
      entity.metadata.annotations[annotation] = v;
    });
  }
}

function setProfileProps(entity: UserEntity, entry: SearchEntry, vendor: LdapVendor, map: UserConfig['map']) {
  for (const prop of ['displayName', 'email'] as const) {
    mapStringAttr(entry, vendor, map.rdn, v => {
      if (!entity.spec.profile) {
        return;
      }
      entity.spec.profile[prop] = v;
    });
  }
}

export async function userTransformer(
  vendor: LdapVendor,
  config: UserConfig,
  entry: SearchEntry,
): Promise<UserEntity | undefined> {
  const { set, map } = config;

  const entity: UserEntity = {
    apiVersion: 'backstage.io/v1beta1',
    kind: 'User',
    metadata: {
      name: '',
      annotations: {},
    },
    spec: {
      profile: {},
      memberOf: [],
    },
  };

  if (set) {
    for (const [path, value] of Object.entries(set)) {
      lodashSet(entity, path, value);
    }
  }

  mapStringAttr(entry, vendor, map.name, v => {
    const name = normalizeEntityName(v);

    assert(!!name, `no entity name for ${JSON.stringify(entry)}`);

    entity.metadata.name = name;
  });

  mapStringAttr(entry, vendor, map.description, v => {
    entity.metadata.description = v;
  });

  mapStringAttr(entry, vendor, map.co, v => {
    assert(!!entity.spec.profile, `no entity spec profile`);

    entity.spec.profile.country = v;
  });

  mapStringAttr(entry, vendor, map.l, v => {
    assert(!!entity.spec.profile, `no entity spec profile`);

    entity.spec.profile.state = v;
  });

  mapStringAttr(entry, vendor, map.employeeType, v => {
    assert(!!entity.spec.profile, `no entity spec profile`);

    entity.spec.profile.jobTitle = v;
  });

  setAnnotations(entity, entry, vendor, map);

  setProfileProps(entity, entry, vendor, map);

  return entity;
}
