import type { SearchEntry } from 'ldapjs';
import type { LdapVendor } from '@backstage/plugin-catalog-backend-module-ldap';

function decode(entry: SearchEntry, attributeName: string, decoder: (value: string | Buffer) => string): string[] {
  const values = entry.raw[attributeName];
  if (Array.isArray(values)) {
    return values.map(v => {
      return decoder(v);
    });
  } else if (values) {
    return [decoder(values)];
  }
  return [];
}

export const DefaultLdapVendor: LdapVendor = {
  dnAttributeName: 'entryDN',
  uuidAttributeName: 'entryUUID',
  decodeStringAttribute: (entry, name) => {
    return decode(entry, name, value => {
      return value.toString();
    });
  },
} as const;
