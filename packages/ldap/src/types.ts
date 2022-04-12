declare module 'ldapjs' {
  interface RDNS {
    attrs: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
    }
  }
  interface DN {
    rdns: RDNS[];
  }
  export interface SearchRequest {
    dn: DN;
  }

  export interface LDAPResult {
    // 0 is success
    end(status?: number): void;
  }

  export interface SearchResponse extends LDAPResult {
    send(entry: SearchEntry | SearchReference, noFiltering?: boolean): void;
  }

  export interface CompareRequest {
    entry: SearchEntry;
    attribute: Attribute;
    value: string | Buffer;
    dn: DN;
  }

  export type CompareResponse = LDAPResult;
  export type BindResponse = LDAPResult;

  export interface BindRequest {
    credentials: string;
    dn: DN
  }
}

export interface LDAPOptions {
  log?: boolean;
  port?: number;
  baseDN: string;
  bindDn: string;
  groupDN: string
  bindPassword: string;
}

export interface UserData {
  uuid: string;
  cn: string;
  password: string;
}

export interface LDAPStoreOptions<T extends UserData> {
  users: Iterable<T>;
}

export interface Port {
  port: number;
}
