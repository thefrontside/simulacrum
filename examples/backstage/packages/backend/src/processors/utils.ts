import { Error as LDAPError } from 'ldapjs';

export function errorString(error: LDAPError): string {
  return `${error.code} ${error.name}: ${error.message}`;
}
