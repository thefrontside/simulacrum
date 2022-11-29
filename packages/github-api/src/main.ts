import type { AddressInfo } from 'net';
import { startStandaloneServer } from './service/standaloneServer';
import type { GraphGen } from '@frontside/graphgen';

const port = process.env.PORT ? Number(process.env.PORT) : undefined;


async function main(factory: GraphGen) {
  console.time('create seed data');
  console.timeEnd('create seed data');

  let users = factory.all('User');

  let githubRepositories = factory.all('GithubRepository');
  let githubOrganizations = factory.all('GithubOrganization');

  let server = await startStandaloneServer({
    port,
    users,
    githubRepositories,
    githubOrganizations,
  });

  let address = server.address() as AddressInfo;

  console.log(
    `GraphQL server with GraphiQL started on http://localhost:${address.port}/graphql`,
  );

  process.on('SIGINT', () => {
    console.log('CTRL+C pressed; exiting.');
    server.close();
    process.exit(0);
  });

  return address;
}

export function startGithubApiSimulator(factory: GraphGen) {
  main(factory).catch(err => console.error(err));
}

