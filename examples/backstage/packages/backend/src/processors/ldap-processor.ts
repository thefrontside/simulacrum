/* eslint-disable @typescript-eslint/no-unused-vars */
import { Entity, LocationSpec } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import { Logger } from 'winston';
import { CatalogProcessor, CatalogProcessorEmit, results } from '@backstage/plugin-catalog-backend';
import { LdapProviderConfig, readLdapConfig } from '@backstage/plugin-catalog-backend-module-ldap';
import { readLdapUsers } from './read';
import { LdapClient } from './client';
import { assert } from 'assert-ts';
import { UserTransformer } from './types';

/**
 * Extracts teams and users out of an LDAP server.
 */
export class LdapProcessor implements CatalogProcessor {
  private readonly providers: LdapProviderConfig[];
  private readonly logger: Logger;
  private readonly userTransformer: UserTransformer;

  static fromConfig(
    config: Config,
    options: {
      logger: Logger;
      userTransformer: UserTransformer;
    },
  ): LdapProcessor {
    let c = config.getOptionalConfig('catalog.processors.ldapOrg');

    return new LdapProcessor({
      ...options,
      providers: c ? readLdapConfig(c) : [],
    });
  }

  constructor(options: {
    providers: LdapProviderConfig[];
    logger: Logger;
    userTransformer: UserTransformer;
  }) {
    this.providers = options.providers;
    this.logger = options.logger;
    this.userTransformer = options.userTransformer;
  }

  async readLocation(location: LocationSpec, _optional: boolean, emit: CatalogProcessorEmit): Promise<boolean> {
    if (location.type !== 'ldap-org') {
      return false;
    }

    let provider = this.providers.find(p => location.target === p.target);
    
    if (!provider) {
      throw new Error(
        `There is no LDAP Org provider that matches ${location.target}. Please add a configuration entry for it under catalog.processors.ldapOrg.providers.`,
      );
    }

    this.logger.info('Reading LDAP users and groups');

    let client = await LdapClient.create(this.logger, provider.target, provider.bind);

    let searchCallback = (entity: Entity): void => {
      this.logger.info(`processing ldap user ${entity.metadata.name}`);

      emit(results.entity({ ...location, target: provider.target }, entity));
    };

    await readLdapUsers(client, provider.users, searchCallback, {
      transformer: this.userTransformer,
      logger: this.logger,
    });

    return true;
  }
}
