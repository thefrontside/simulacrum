import type { SimulationHandlers } from "@simulacrum/foundation-simulator";
import type { ExtendedSimulationStore } from "../store";
import { getSchema } from "src/utils";
import { blobAsBase64, commitStatusResponse, gitTrees } from "./utils";

let document = getSchema("api.github.com.json");

const handlers =
  (initialState: any) =>
  (simulationStore: ExtendedSimulationStore): SimulationHandlers => {
    if (!initialState) return {};
    // L# refer to openapi spec json files
    return {
      // L#61612 /user/installations
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
        const repos = simulationStore.schema.repositories.selectTableAsList(
          simulationStore.store.getState()
        );
        response.status(200).json(repos);
      },

      // L#18386 /orgs/{org}/repos
      "repos/list-for-org": async (_context, _request, response) => {
        const repos = simulationStore.schema.repositories.selectTableAsList(
          simulationStore.store.getState()
        );
        response.status(200).json(repos);
      },
      // L#29067 /repos/{owner}/{repo}/branchesb
      "repos/list-branches": async (_context, _request, response) => {
        // TODO branches
        const branches = simulationStore.schema.repositories.selectTableAsList(
          simulationStore.store.getState()
        );
        response.status(200).json(branches);
      },
      // L#36879 /repos/{owner}/{repo}/commits/{ref}/status
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
      // L#37116 /repos/{owner}/{repo}/contents/{path}
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
      // L#40919 /repos/{owner}/{repo}/git/blobs/{file_sha}
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
      // L#41860 /repos/{owner}/{repo}/git/trees/{tree_sha}
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

      // L#58975 /user
      "users/get-authenticated": async (_context, _request, response) => {
        const users = simulationStore.schema.users.selectTableAsList(
          simulationStore.store.getState()
        );
        const user = users[0];
        const data = {
          id: parseInt(user?.id ?? "1", 10) as Number,
          login: user?.githubAccount.login,
          email: user?.email,
          name: user?.displayName,
        };
        response.status(200).json(data);
      },

      // L#62462 /user/memberships/orgs
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
    };
  };

export const openapi = (initialState) => [
  {
    document,
    handlers: handlers(initialState),
    apiRoot: "/api/v3",
    additionalOptions: {
      ajvOpts: {
        strictTypes: false,
        allErrors: true,
      },
    },
  },
];
