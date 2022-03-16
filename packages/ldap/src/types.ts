export interface LDAPOptions {
  log?: boolean;
  port?: number;
  baseDN: string;
  bindDn: string;
  groupDN: string
  bindPassword: string;
}
