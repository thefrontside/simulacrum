import type { PageArgs } from "./relay";
import { applyRelayPagination } from "./relay";
import type { Resolvers } from "../__generated__/resolvers-types";
import { toGraphql } from "./to-graphql";
import { assert } from "assert-ts";
import type { ExtendedSimulationStore } from "../store";

export function createResolvers(
  simulationStore: ExtendedSimulationStore
): Resolvers {
  return {
    Query: {
      // @ts-expect-error not a fully qualified return per type, TODO fill it out
      viewer() {
        let user = simulationStore.schema.users.selectById(
          simulationStore.store.getState(),
          { id: "user:1" as any }
        );
        assert(!!user, `no logged in user`);
        return toGraphql(simulationStore, "User", user);
      },
      // @ts-expect-error not a fully qualified return per type, TODO fill it out
      organization(_: unknown, { login }: { login: string }) {
        let orgs = simulationStore.schema.organizations.selectTableAsList(
          simulationStore.store.getState()
        );
        let [org] = orgs.filter((o) => o.login === login);
        assert(!!org, `no organization found for ${login}`);
        let __typename = (org?.id?.toString() ?? ":").split(":")[0];
        assert(
          __typename === "githuborganization",
          `incorrectly structured GitHubOrganization id ${org.id}`
        );
        let shaped = toGraphql(simulationStore, "Organization", org);
        return shaped;
      },
      // @ts-expect-error not a fully qualified return per type, TODO fill it out
      organizations(pageArgs: PageArgs) {
        let orgs = simulationStore.schema.organizations.selectTableAsList(
          simulationStore.store.getState()
        );
        return applyRelayPagination(orgs, pageArgs, (org) =>
          toGraphql(simulationStore, "Organization", org)
        );
      },
      // @ts-expect-error not a fully qualified return per type, TODO fill it out
      repository(_, { owner, name }: { owner: string; name: string }) {
        let repo = simulationStore.schema.repositories
          .selectTableAsList(simulationStore.store.getState())
          .find(
            (r) =>
              r.name.toLowerCase() === name &&
              r.full_name.toLowerCase() === `${owner}/${name}`.toLowerCase()
          );
        assert(!!repo, `no repository found for ${name}`);
        return toGraphql(simulationStore, "Repository", repo);
      },
      // @ts-expect-error not a fully qualified return per type, TODO fill it out
      repositoryOwner(_, { login }: { login: string }) {
        let [org] = simulationStore.schema.organizations
          .selectTableAsList(simulationStore.store.getState())
          .filter((o) => o.login === login);
        // let [org] = [...githubOrganizations].filter((o) => o.login === login);
        if (org) return toGraphql(simulationStore, "Organization", org);

        let [userAccount] = simulationStore.schema.users
          .selectTableAsList(simulationStore.store.getState())
          // TODO should we use u?.githubAccount?.login here?
          .filter((u) => u?.login === login);
        assert(
          !!userAccount,
          `no github organization or account found for ${login}`
        );
        if (userAccount) return toGraphql(simulationStore, "User", userAccount);
      },
    },
  };
}
