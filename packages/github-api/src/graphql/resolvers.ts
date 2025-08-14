import type { PageArgs } from "./relay.ts";
import { applyRelayPagination } from "./relay.ts";
import type { Resolvers } from "../__generated__/resolvers-types.ts";
import { toGraphql, deriveOwner } from "./to-graphql.ts";
import { assert } from "assert-ts";
import type { ExtendedSimulationStore } from "../store/index.ts";

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
        return toGraphql(simulationStore, "Organization", org);
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
        return deriveOwner(simulationStore, login);
      },
    },
  };
}
