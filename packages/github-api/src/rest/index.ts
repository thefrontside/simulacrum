import type { SimulationHandlers } from "@simulacrum/foundation-simulator";
import type { ExtendedSimulationStore } from "../store";
import { getSchema } from "../utils";
import { blobAsBase64, commitStatusResponse, gitTrees } from "./utils";

let document = getSchema("api.github.com.json");

const handlers =
  (
    initialState: Record<string, any> | undefined,
    extendedHandlers:
      | ((simulationStore: ExtendedSimulationStore) => SimulationHandlers)
      | undefined
  ) =>
  (simulationStore: ExtendedSimulationStore): SimulationHandlers => {
    if (!initialState) return {};
    // note for any cases where it `return`s an object,
    //  that will validate the response per the schema
    return {
      // GET /user/installations
      "apps/list-installations": async (_context, _request, response) => {
        const ghOrgs = simulationStore.selectors.allGithubOrganizations(
          simulationStore.store.getState()
        );
        const data = ghOrgs.map((org, index) => ({
          id: index,
          account: org,
        }));
        response.status(200).json(data);
      },
      // L#4134 /installation/repositories
      "apps/list-repos-accessible-to-installation": async (
        _context,
        _request,
        response
      ) => {
        const repos = simulationStore.selectors.allReposWithOrgs(
          simulationStore.store.getState()
        );
        return {
          status: 200,
          json: {
            total_count: repos.length,
            repositories: repos,
          },
        };
      },
      // GET /orgs/{org}/installation - Get an organization installation for the authenticated app
      "apps/get-org-installation": async (context, _request, response) => {
        const { org } = context.request.params;
        const install = simulationStore.selectors.getAppInstallation(
          simulationStore.store.getState(),
          org
        );
        return { status: 200, json: install };
      },
      // GET /repos/{owner}/{repo}/installation - Get a repository installation for the authenticated app
      "apps/get-repo-installation": async (context, _request, response) => {
        const { org } = context.request.params;
        const install = simulationStore.selectors.getAppInstallation(
          simulationStore.store.getState(),
          org
        );
        return { status: 200, json: install };
      },

      // GET /orgs/{org}/repos
      "repos/list-for-org": async (_context, _request, response) => {
        const repos = simulationStore.selectors.allReposWithOrgs(
          simulationStore.store.getState()
        );
        return { status: 200, json: repos };
      },
      // L#29067 /repos/{owner}/{repo}/branches
      "repos/list-branches": async (_context, _request, response) => {
        const branches = simulationStore.schema.branches.selectTableAsList(
          simulationStore.store.getState()
        );
        return { status: 200, json: branches };
      },
      // GET /repos/{owner}/{repo}/commits/{ref}/status
      "repos/get-combined-status-for-ref": async (
        _context,
        request,
        response
      ) => {
        const { owner, repo, ref } = request.params;
        const commitStatus = commitStatusResponse({
          host: `${request.protocol}://${request.headers.host}`,
          owner,
          repo,
          ref,
        });
        response.status(200).json(commitStatus);
      },
      // GET /repos/{owner}/{repo}/contents/{path}
      "repos/get-content": async (context, request, response) => {
        const { owner, repo, path } = context.request.params;
        const blob = simulationStore.selectors.getBlob(
          simulationStore.store.getState(),
          owner,
          repo,
          path
        );
        if (!blob) {
          response.status(404).send("fixture does not exist");
        } else {
          const data = blobAsBase64({
            blob,
            host: `${request.protocol}://${request.headers.host}`,
            owner,
            repo,
            ref: path,
          });
          response.status(200).json(data);
        }
      },
      // GET /repos/{owner}/{repo}/git/blobs/{file_sha}
      "git/get-blob": async (context, request, response) => {
        const { owner, repo, file_sha } = context.request.params;
        const blob = simulationStore.selectors.getBlob(
          simulationStore.store.getState(),
          owner,
          repo,
          file_sha
        );
        if (!blob) {
          response.status(404).send("fixture does not exist");
        } else {
          const data = blobAsBase64({
            blob,
            host: `${request.protocol}://${request.headers.host}`,
            owner,
            repo,
            ref: file_sha,
          });
          response.status(200).json(data);
        }
      },
      // GET /repos/{owner}/{repo}/git/trees/{tree_sha}
      "git/get-tree": async (_context, request, response) => {
        const { owner, repo, ref } = request.params;
        const blobs = simulationStore.selectors.getBlobAtOwnerRepo(
          simulationStore.store.getState(),
          owner,
          repo
        );
        if (!blobs) {
          response.status(404).send("fixture does not exist");
        } else {
          const tree = gitTrees({
            blobs,
            host: `${request.protocol}://${request.headers.host}`,
            owner,
            repo,
            ref,
          });
          response.status(200).json(tree);
        }
      },

      // GET /user
      "users/get-authenticated": async (_context, _request, response) => {
        const users = simulationStore.schema.users.selectTableAsList(
          simulationStore.store.getState()
        );
        const user = users[0];
        const data = {
          id: parseInt(user?.id?.toString() ?? "1", 10) as Number,
          login: user?.login,
          email: user?.email,
          name: user?.name,
        };
        response.status(200).json(data);
      },

      // GET /user/memberships/orgs
      "orgs/list-memberships-for-authenticated-user": async (
        _context,
        _request,
        response
      ) => {
        // list all orgs
        const ghOrgs = simulationStore.selectors.allGithubOrganizations(
          simulationStore.store.getState()
        );
        response.status(200).json(ghOrgs);
      },
      ...(extendedHandlers ? extendedHandlers(simulationStore) : {}),
    };
  };

export const openapi = (
  initialState: Record<string, any> | undefined,
  openapiHandlers:
    | ((simulationStore: ExtendedSimulationStore) => SimulationHandlers)
    | undefined
) => [
  {
    document,
    handlers: handlers(initialState, openapiHandlers),
    apiRoot: "/api/v3",
    additionalOptions: {
      // starts up quicker and avoids the precompile step which throws a ton of errors
      //  based on openapi-backend handling of GitHub schema
      quick: true,
    },
  },
];
