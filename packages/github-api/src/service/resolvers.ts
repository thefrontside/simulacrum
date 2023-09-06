import type { PageArgs } from '../relay';
import { applyRelayPagination } from '../relay';
import type { Resolvers, SimulatedData } from './types';
import { toGraphql } from './graphgen-to-graphql';
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
          .flatMap((e) => e.githubAccount?.organizations)
          .flatMap((org) => (!!org ? [org] : []));

        return {
          organizations: applyRelayPagination(
            orgs,
            { first: size, after: cursor },
            (org) => toGraphql(org)
          ),
        };
      },
      organization(_: unknown, { login }: { login: string }) {
        let [org] = [...githubOrganizations].filter((o) => o.login === login);
        assert(!!org, `no organization found for ${login}`);
        return toGraphql(org);
      },
      organizations(pageArgs: PageArgs) {
        let orgs = [...githubOrganizations];
        return applyRelayPagination(orgs, pageArgs, (org) => toGraphql(org));
      },
      repository(_, { owner, name }: { owner: string; name: string }) {
        let repo = [...githubRepositories].find(
          (r) =>
            r.name.toLowerCase() === name &&
            r.nameWithOwner.toLowerCase() === `${owner}/${name}`.toLowerCase()
        );
        assert(!!repo, `no repository found for ${name}`);
        return toGraphql(repo);
      },
      repositoryOwner(_, { login }: { login: string }) {
        let [org] = [...githubOrganizations].filter((o) => o.login === login);
        if (org) return toGraphql(org, "GithubRepositoryOwner");

        let [userAccount] = [...users].filter(
          (u) => u.githubAccount.login === login
        );
        assert(
          !!userAccount,
          `no github organization or account found for ${login}`
        );
        if (userAccount)
          return toGraphql(userAccount.githubAccount, "GithubRepositoryOwner");
      },
    },
  };
}
