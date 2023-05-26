import type { PageArgs } from '../relay';
import { applyRelayPagination } from '../relay';
import type { Resolvers, SimulatedData } from './types';
import { requestRepositories } from './repositories';
import { assert } from 'assert-ts';

export function createResolvers({
  users,
  githubRepositories,
  githubOrganizations,
}: SimulatedData): Resolvers {
  return {
    Query: {
      viewer(_: unknown, { size, cursor }: { size: number; cursor?: string }) {
        let orgs = [...users]
          .flatMap(e => e.githubAccount?.organizations)
          .flatMap(org => (!!org ? [org] : []));

        return {
          organizations: applyRelayPagination(
            orgs,
            { first: size, after: cursor },
            node => {
              return {
                ...node,
                teams: applyRelayPagination(node.teams, { first: 10 }, team => {
                  return {
                    ...team,
                  };
                }),
              };
            },
          ),
        };
      },
      organization(_: unknown, { login }: { login: string }) {
        let [org] = [...githubOrganizations].filter(o => o.login === login);

        assert(!!org, `no orginization found for ${login}`);

        // TODO: why do we have commits with the repos?
        let organizationRepositories = org.repositories.filter(
          repo => !!repo.owner,
        );

        return {
          ...org,
          repositories(pageArgs: PageArgs) {
            return requestRepositories(organizationRepositories, pageArgs);
          },
        };
      },
      organizations(pageArgs: PageArgs) {
        let orgs = [...githubOrganizations];

        return applyRelayPagination(orgs, pageArgs, org => {
          return {
            ...org,
            repositories(repositoryiesPageArgs: PageArgs) {
              return requestRepositories(
                org.repositories,
                repositoryiesPageArgs,
              );
            },
          };
        });
      },
      repository(_, { owner, name }: { owner: string; name: string }) {
        let repo = [...githubRepositories].find(
          (r) =>
            r.name.toLowerCase() === name &&
            r.nameWithOwner.toLowerCase() === `${owner}/${name}`.toLowerCase()
        );

        assert(!!repo, `no repository found for ${name}`);

        return {
          // id: repo.id,
          name: repo.name,
          nameWithOwner: repo.nameWithOwner,
          url: repo.url,
          description: repo.description,
          visibility: repo.visibility,
          isArchived: repo.isArchived,
          defaultBranchRef: {
              name: repo.defaultBranchRef.name
          },
          languages: {
            nodes: repo.languages.map(l => ({
              name: l,
            })),
          },
          repositoryTopics: {
            nodes: repo.repositoryTopics.map(t => ({
              topic: { name: t },
            })),
          },
          owner: {
            __typename: 'teams' in repo.owner ? 'Organization' : 'User',
            name: repo.owner.name,
            login: repo.owner.login,
          },
          // collaborators(pageArgs: PageArgs) {
          //   return applyRelayPagination(repo.collaborators, pageArgs);
          // },
        };
      },
    },
  };
}
