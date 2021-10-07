import { NextCatalogBuilder, createRouter, AnnotateLocationEntityProcessor } from '@backstage/plugin-catalog-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';
import { ScmIntegrations } from '@backstage/integration';
import { LdapProcessor } from '../processors/ldap-processor';
import { userTransformer } from '../processors/user-transformer';

export default async function createPlugin(env: PluginEnvironment): Promise<Router> {
  let builder = new NextCatalogBuilder(env);
  let { config, logger } = env;
  let integrations = ScmIntegrations.fromConfig(config);

  builder.replaceProcessors([
    LdapProcessor.fromConfig(config, { logger, userTransformer }),
    new AnnotateLocationEntityProcessor({ integrations }),
  ]);

  let { entitiesCatalog, locationsCatalog, locationService, processingEngine, locationAnalyzer } = await builder.build();

  await processingEngine.start();

  return await createRouter({
    entitiesCatalog,
    locationsCatalog,
    locationService,
    locationAnalyzer,
    logger: env.logger,
    config: env.config,
  });
}
