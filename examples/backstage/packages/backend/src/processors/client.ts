import ldap, { Client, SearchEntry, SearchOptions } from 'ldapjs';
import type { BindConfig, SearchCallback } from './types';
import { Logger } from 'winston';
import { errorString } from './utils';
import { DefaultLdapVendor } from './vendor';

// TODO: do we have the correct vendor?
type Vendors = typeof DefaultLdapVendor;

export class LdapClient {
  static async create(logger: Logger, target: string, bind?: BindConfig): Promise<LdapClient> {
    const client = ldap.createClient({ url: target });

    client.on('error', (err: ldap.Error) => {
      logger.warn(`LDAP client threw an error, ${errorString(err)}`);
    });

    if (!bind) {
      return new LdapClient(client, logger);
    }

    return new Promise<LdapClient>((resolve, reject) => {
      const { dn, secret } = bind;
      client.bind(dn, secret, err => {
        if (err) {
          reject(`LDAP bind failed for ${dn}, ${errorString(err)}`);
        } else {
          resolve(new LdapClient(client, logger));
        }
      });
    });
  }

  constructor(private readonly client: Client, private readonly logger: Logger) {}

  async search(dn: string, options: SearchOptions): Promise<SearchEntry[]> {
    try {
      const output: SearchEntry[] = [];

      const logInterval = setInterval(() => {
        this.logger.debug(`Read ${output.length} LDAP entries so far...`);
      }, 5000);

      const search = new Promise<SearchEntry[]>((resolve, reject) => {
        this.client.search(dn, options, (err, res) => {
          if (err) {
            reject(new Error(errorString(err)));
            return;
          }

          res.on('searchReference', () => {
            reject(new Error('Unable to handle referral'));
          });

          res.on('searchEntry', entry => {
            output.push(entry);
          });

          res.on('error', e => {
            reject(new Error(errorString(e)));
          });

          res.on('end', r => {
            if (!r) {
              reject(new Error('Null response'));
            } else if (r.status !== 0) {
              reject(new Error(`Got status ${r.status}: ${r.errorMessage}`));
            } else {
              resolve(output);
            }
          });
        });
      });

      return await search.finally(() => {
        clearInterval(logInterval);
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      throw new Error(`LDAP search at DN "${dn}" failed, ${e.message}`);
    }
  }

  async searchStreaming(dn: string, options: SearchOptions, f: SearchCallback): Promise<void> {
    try {
      return await new Promise<void>((resolve, reject) => {
        this.client.search(dn, options, (err, res) => {
          if (err) {
            reject(new Error(errorString(err)));
          }

          res.on('searchReference', () => {
            reject(new Error('Unable to handle referral'));
          });

          res.on('searchEntry', entry => {
            f(entry);
          });

          res.on('error', e => {
            reject(new Error(errorString(e)));
          });

          res.on('end', r => {
            if (!r) {
              throw new Error('Null response');
            } else if (r.status !== 0) {
              throw new Error(`Got status ${r.status}: ${r.errorMessage}`);
            } else {
              resolve();
            }
          });
        });
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      throw new Error(`LDAP search at DN "${dn}" failed, ${e.message}`);
    }
  }

  async getVendor(): Promise<Vendors> {
    return DefaultLdapVendor;
  }

  /**
   * Get the Root DSE.
   *
   * @see https://ldapwiki.com/wiki/RootDSE
   */
  async getRootDSE(): Promise<SearchEntry | undefined> {
    const result = await this.search('', {
      scope: 'base',
      filter: '(objectclass=*)',
    } as SearchOptions);
    if (result && result.length === 1) {
      return result[0];
    }
    return undefined;
  }
}
